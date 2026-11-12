# Honkbal Trainer — frontend

De statische SvelteKit-PWA staat los van de backend. Installeer en controleer vanuit de workspace met:

Gebruik voor de testtooling Node.js 22.12 of nieuwer (Node 24 wordt ondersteund).

```powershell
npm install
npm run check --workspace honkbal-trainer-app
npm test --workspace honkbal-trainer-app
npm run build --workspace honkbal-trainer-app
```

De statische uitvoer staat in `app/build`; configureer de host om onbekende routes naar `200.html` te sturen. Azure Storage kan daarbij alsnog HTTP 404 teruggeven. De serviceworker bewaart de app-shell, maar geen beveiligde API-antwoorden; live gegevens zijn offline niet beschikbaar.

De frontend gebruikt Microsoft-aanmelding met MSAL en de live API-client. Stel vóór de build `VITE_ENTRA_TENANT_ID`, `VITE_ENTRA_PWA_CLIENT_ID`, `VITE_ENTRA_API_CLIENT_ID` en `VITE_API_BASE_URL` in. Het API-adres eindigt op `/api` en gebruikt HTTPS (localhost mag HTTP gebruiken). Registreer de exacte website-origin met afsluitende `/` als SPA-redirect in Entra. Deze waarden zijn geen secrets. Zonder configuratie of geldige aanmelding wordt geen voorbeelddata getoond. De API controleert rollen en teamtoewijzingen; UI-zichtbaarheid is geen beveiliging.

Instellingen en de warming-upchecklist worden lokaal per team op het apparaat bewaard. Voor het eerste gebruik moeten de bestaande catalogus en eventuele door de club vastgestelde leeftijdsdoelen in Cosmos zijn geïmporteerd; de app verzint die doelen niet. Het leeftijdsfilter in de catalogus is informatief, omdat categorie-/skillkoppelingen nog ontbreken. De frontend en aanmelding zijn nog niet live end-to-end getest.

Een TC-lid kan onder Beheer per leeftijdscategorie clubdoelen en vaardigheidsleerlijnen vaststellen. Elke wijziging maakt een nieuwe versie; bestaande seizoenssamenstellingen blijven op hun oude versie staan. De vaardigheids-ID moet overeenkomen met een catalogustag om oefeningen te selecteren. Leeftijdsovergangen worden niet automatisch bepaald; de TC legt de doelen per categorie vast.
