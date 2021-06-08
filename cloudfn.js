const request = require("request-promise");
var Cloudant = require("@cloudant/cloudant");

let cclient;

let gparams;

const initCloudant = async (url, apikey) => {
  cclient = Cloudant({
    url: url,
    plugins: [{ iamauth: { iamApiKey: apikey } }],
  });
  cclient = cclient.use("tarifeitorbot");
};

const useCclient = async () => {
  if (!cclient) {
    await initCloudant(gparams.c_url, gparams.c_apikey);
  }

  return cclient;
};

const msgs = [
  [
    "Dale caña al horno, la lavadora y la secadora.",
    "Buena hora para poner lavadoras desde que tu novia se compró el satisfyer.",
    "Puedes darle a la luz y contemplar el orco que te has traído de la calle.",
    "Ole, ole y ole los caracoles.",
    "Si estabas pensando en poner la lavadora mientras haces un pollo asado, y lees con luces de xeon con el aire acondicionado puesto, este es el momento.",
    "El KWh está por los suelos, como tu autoestima.",
    "F para el KWh porque:",
    "Ya puedes enchufar el soporte vital de la abuela.",
  ],
  [
    "Cuidadín, que te va a costar carete.",
    "Desenchufa el vibrador, mejor te la agarras con la mano.",
    "No es buena hora para el aire acondicionado, mejor te abanicas la seta con la mano.",
    "Si estas leyendo más te vale usar la luz de fuera y quedarte ciego.",
    "El KWh empieza a bajar, Wallstreetwolverine te dice que holdees el interruptor apagado.",
    "Eh, eh, que baja que baja (o sube).",
    "Si la lavadora acaba de empezar preparate para pagar:",
  ],
  [
    "¡Deja de planchar o Endesa te envía una estaca con la factura!",
    "La hora favorita de los dueños de Iberdrola:",
    "No está la factura para farolillos:",
    "Yo que tú apagaba todo, a no ser que seas Amancio Ortega.",
    "Hora de apagar las luces y encender las velas.",
    "Sube el KWh, tu cuenta bancaria baja.",
    "Ten cuidado que ahora mismo el KWh está más caro que el Bitcoin.",
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
    await (
      await useCclient()
    ).insert({}, "chatid" + Math.abs(chatId % 10) + ":" + chatId);
  } catch {}
};

const removeChat = async (chatId) => {
  try {
    await (
      await useCclient()
    ).destroy(
      "chatid" + Math.abs(chatId % 10) + ":" + chatId,
      (
        await (
          await useCclient()
        ).get("chatid" + Math.abs(chatId % 10) + ":" + chatId)
      )._rev
    );
  } catch {}
};

let sentMsg = Math.floor(Math.random() * 100000);

const randomMsg = (rate) => {
  const items = msgs[rate];
  return items[++sentMsg % items.length] + " " + rateMessage[rate];
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

const sendMessageToChat = async (token, chat_id, text) => {
  try {
    await request({
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
  } catch {}
};

const processAction = async (msg, token) => {
  if (msg && msg.text) {
    if (msg.text.includes("/start")) {
      await sendMessageToChat(token, msg.chat.id, startMessage);
    } else if (msg.text.includes("/ahoraluz")) {
      await sendMessageToChat(token, msg.chat.id, randomMsg(currentRate()));
    } else if (msg.text.includes("/activaluz")) {
      await addChat(msg.chat.id);
      await sendMessageToChat(token, msg.chat.id, activateMessage);
    } else if (msg.text.includes("/desactivaluz")) {
      await removeChat(msg.chat.id);
      await sendMessageToChat(token, msg.chat.id, deactivateMessage);
    }
  }
};

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main(params) {
  if (params.intoken !== params.webhookToken) {
    return;
  }

  gparams = params;

  if (params.message) {
    await processAction(params.message, params.token);
  } else {
    const lastRate = (await (await useCclient()).get("next:lastRate")).lastRate;

    const currentR = currentRate();

    if (lastRate !== currentR) {
      await (
        await useCclient()
      ).insert(
        {
          lastRate: currentR,
          _rev: (await (await useCclient()).get("next:lastRate"))._rev,
        },
        "next:lastRate"
      );
      for (let i = 0; i < 10; i++) {
        await Promise.all(
          (
            await (
              await useCclient()
            ).partitionedList("chatid" + i, { include_docs: true })
          ).rows.map(
            async (row) =>
              await sendMessageToChat(
                params.token,
                row.id.split(":")[1],
                randomMsg(currentR)
              )
          )
        );
        await sleep(2000);
      }
    }
  }

  return { body: { ok: true } };
}
