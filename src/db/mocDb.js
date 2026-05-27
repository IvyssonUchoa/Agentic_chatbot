import { initializeDB } from "../db/database.js";

import { StateModel } from "../models/stateModel.js";
import { EventModel } from "../models/eventModel.js";

await initializeDB();

const ev = new EventModel();

let event;

event = await ev.createEvent("07/09/2026 00:00", "07/09/2026 23:59", "Independência do Brasil", "Feriado Nacional");
console.log(event);

event = await ev.createEvent("12/10/2026 00:00", "12/10/2026 23:59", "Feriado de Nossa Senhora Aparecida", "Feriado Nacional");
console.log(event);

event = await ev.createEvent("15/11/2026 00:00", "15/11/2026 23:59", "Proclamação da República", "Feriado Nacional");
console.log(event);

event = await ev.createEvent("25/12/2026 00:00", "25/12/2026 23:59", "Natal", "Feriado Nacional");
console.log(event);

event = await ev.createEvent("30/12/2026 00:00", "01/01/2027 23:59", "Ano Novo", "Feriado Nacional");
console.log(event);


event = await ev.createEvent("20/05/2026 00:00", "22/05/2026 23:59", "Paralização das escolas Particulares", "Paralização");
console.log(event);

event = await ev.createEvent("29/05/2026 00:00", "29/05/2026 23:59", "Paralização das escolas Particulares", "Paralização");
console.log(event);