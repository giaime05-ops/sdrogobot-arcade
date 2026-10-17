// ============================================================
//  CONFIGURAZIONE DELLA MINI APP  (l'unico file da toccare per cambiare indirizzi)
// ============================================================
window.ARCADE_CONFIG = {
  // Indirizzo pubblico del bot su Northflank, SENZA barra finale.
  // Es.: "https://site--sdrogobot--xxxx.code.run"
  API_BASE: "https://site--sdrogobot--ptv7wttm2w6r.code.run",

  // Percorso dell'endpoint che restituisce i dati del giocatore.
  ME_PATH: "/api/me",

  // Come viene inviato l'initData di Telegram al server:
  //  "xheader" -> intestazione  X-Telegram-Init-Data: <initData>   (quella che usa webapi.py)
  //  "header" -> intestazione  Authorization: tma <initData>
  //  "query"  -> parametro ?initData=...
  AUTH_MODE: "xheader",

  // Fuori da Telegram (browser normale) la pagina mostra dati finti di prova.
  // Metti false per vietare del tutto la modalità demo.
  ALLOW_DEMO: true,
};
