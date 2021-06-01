const request = require("request-promise");
var Cloudant = require("@cloudant/cloudant");

let cclient;

const initCloudant = async (url, apikey) => {
  cclient = Cloudant({
    url: url,
    plugins: [{ iamauth: { iamApiKey: apikey } }],
  });
  cclient = cclient.use("tarifeitorbot");
};

const msgs = [
  [
    "Dale caña al horno, la lavadora y la secadora.",
    "Buena hora para poner lavadoras desde que tu novia se compró el satisfyer.",
    "Puedes darle a la luz y contemplar el orco que te has traído de la calle.",
  ],
  [
    "Cuidadín, que te va a costar carete.",
    "Desenchufa el vibrador, mejor te la agarras con la mano.",
    "No es buena hora para el aire acondicionado, mejor te abanicas la seta con la mano.",
  ],
  [
    "¡Deja de planchar o Endesa te envía una estaca con la factura!",
    "La hora favorita de los dueños de Iberdrola:",
    "No está la factura para farolillos:",
  ],
];

const rateMessage = [
  "Ahora es tarifa VALLE 😎.",
  "Ahora es tarifa LLANO 😐.",
  "Ahora es tarifa PUNTA 🤬.",
];

const startMessage =
  "¡Hola! Soy un bot que te avisa de las horas Punta, Valle y Llano de la tarifa de la luz 🤖.\n Activame con /activaluz \n (Puedo tardar hasta 60 segundos en responderte, ten paciencia ^^')";
const activateMessage =
  "¡Recibido! A partir de ahora te avisaré cuando cambie la tarifa de la luz.";
const deactivateMessage =
  "¡Ok! Ya no te aviso cuando cambie la tarifa de la luz.";

const addChat = async (chatId) => {
  try {
    await cclient.insert({}, "chatid" + Math.abs(chatId % 10) + ":" + chatId);
  } catch {}
};

const removeChat = async (chatId) => {
  try {
    await cclient.destroy(
      "chatid" + Math.abs(chatId % 10) + ":" + chatId,
      (
        await cclient.get("chatid" + Math.abs(chatId % 10) + ":" + chatId)
      )._rev
    );
  } catch {}
};

const randomMsg = (rate) => {
  const items = msgs[rate];
  return (
    items[Math.floor(Math.random() * items.length)] + " " + rateMessage[rate]
  );
};

const currentHourFn = () => {
  formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: false,
  });

  return formatter.format(new Date()).split(" ")[1].split(":")[0];
};

const isWeekend = () => {
  return ["Saturday", "Sunday"].includes(
    new Date().toLocaleString("en-GB", {
      timeZone: "Europe/Madrid",
      weekday: "long",
    })
  );
};

const currentRate = () => {
  if (isWeekend()) {
    return 0;
  } else {
    const currentHour = parseInt(currentHourFn());
    if (currentHour >= 0 && currentHour <= 7) {
      return 0;
    } else if (
      (currentHour >= 10 && currentHour <= 13) ||
      (currentHour >= 18 && currentHour <= 21)
    ) {
      return 2;
    } else {
      return 1;
    }
  }
};

const sendMessageToChat = (token, chat_id, text) => {
  request({
    json: true,
    method: "GET",
    url:
      "https://api.telegram.org/bot" +
      token +
      "/sendMessage?" +
      new URLSearchParams({
        chat_id,
        text,
      }),
    followRedirect: true,
  });
};

const processActions = async (token, offset) => {
  try {
    const queryParams = {
      allowed_updates: '["message"]',
    };
    if (offset) {
      queryParams.offset = offset;
    }
    await request({
      json: true,
      method: "GET",
      url:
        "https://api.telegram.org/bot" +
        token +
        "/getUpdates?" +
        new URLSearchParams(queryParams),
      followRedirect: true,
    }).then(async (data) => {
      await data.result.map(async (update) => {
        const msg = update.message;
        if (msg && msg.text) {
          if (msg.text.includes("/start")) {
            await sendMessageToChat(token, msg.chat.id, startMessage);
          } else if (msg.text.includes("/ahoraluz")) {
            await sendMessageToChat(
              token,
              msg.chat.id,
              randomMsg(currentRate())
            );
          } else if (msg.text.includes("/activaluz")) {
            await addChat(msg.chat.id);
            await sendMessageToChat(token, msg.chat.id, activateMessage);
          } else if (msg.text.includes("/desactivaluz")) {
            await removeChat(msg.chat.id);
            await sendMessageToChat(token, msg.chat.id, deactivateMessage);
          }
        }
      });
      if (data.result.length > 0) {
        const dr = data.result;
        const nextUpdate = dr[dr.length - 1].update_id + 1;
        await cclient.insert(
          { nextUpdate, _rev: (await cclient.get("next:nextUpdate"))._rev },
          "next:nextUpdate"
        );
        await processActions(token, nextUpdate);
      }
    });
  } catch {}
};

async function main(params) {
  if (!cclient) {
    await initCloudant(params.c_url, params.c_apikey);
  }

  const offset = (await cclient.get("next:nextUpdate")).nextUpdate;

  await processActions(params.token, offset);

  const lastRate = (await cclient.get("next:lastRate")).lastRate;

  const currentR = currentRate();

  if (lastRate !== currentR) {
    for (let i = 0; i < 10; i++) {
      await (
        await cclient.partitionedList("chatid" + i, { include_docs: true })
      ).rows.map((row) =>
        sendMessageToChat(
          params.token,
          row.id.split(":")[1],
          randomMsg(currentR)
        )
      );
    }
    await cclient.insert(
      { lastRate: currentR, _rev: (await cclient.get("next:lastRate"))._rev },
      "next:lastRate"
    );
  }

  return { ok: true };
}
