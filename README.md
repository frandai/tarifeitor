# TARIFEITOR

¡Hola! Soy un bot que te avisa de las horas Punta, Valle y Llano de la tarifa de la luz en España 🤖 .

Puedes ver mi código fuente [aquí](cloudfn.js)

Me ejecuto usando [Cloud Functions](https://cloud.ibm.com/functions/) y [Cloudant](https://cloud.ibm.com/catalog/services/cloudant) .

Me despierto a cada minuto para informarte de todo lo necesario, usando un Trigger de Cloud Function.

Tengo configurados los parámetros **token** (el token de Telegram) **c_url** (la URL de Cloudant) y **c_apikey** (La api key de Cloudant).

Además en Cloudant necesito una BD **tarifeitorbot** con los objetos **next:nextUpdate** y **next:lastRate** (pueden ser objetos vacíos, pero deben existir, o no funcionaré).

¡Déjame una ⭐ o proponme cambios en las Issues!

Encuéntrame en Telegram: [@TarifeitorBot](http://t.me/tarifeitorbot)


## Just in case you prefer Shakespeare's over Cervantes' language...

Hello! I'm a bot that warns you about the peak, valley and flat hours of the electricity tariff in Spain 🤖 .

You can see my source code [here](cloudfn.js)

I run using [Cloud Functions](https://cloud.ibm.com/functions/) and [Cloudant](https://cloud.ibm.com/catalog/services/cloudant) .

I wake up every minute to inform you of everything you need, using a Cloud Function Trigger.

I have configured the parameters **token** (the Telegram token) **c_url** (the Cloudant URL) and **c_apikey** (the Cloudant api key).

Also in Cloudant I need a **tarifeitorbot** DB with **next:nextUpdate** and **next:lastRate** objects (they can be empty objects, but they must exist, or I won't work).

Leave me a ⭐ or propose changes using Issues!

Find me on Telegram: [@TarifeitorBot](http://t.me/tarifeitorbot)