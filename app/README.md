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

Voer frontendchecks en tests niet gelijktijdig met de productiebuild uit:
ze delen de gegenereerde SvelteKit-bestanden. Bouw als laatste en publiceer
die uitvoer ongewijzigd. De build controleert of HTML en JavaScript dezelfde
SvelteKit-identificatie gebruiken; een gemengde build kan een wit scherm geven.
Controleer voor publicatie ook het aanmelden-scherm in een browser, niet alleen HTTP 200.

De frontend gebruikt Microsoft-aanmelding met MSAL en de live API-client. Stel vóór de build `VITE_ENTRA_TENANT_ID`, `VITE_ENTRA_PWA_CLIENT_ID`, `VITE_ENTRA_API_CLIENT_ID` en `VITE_API_BASE_URL` in. Het API-adres eindigt op `/api` en gebruikt HTTPS (localhost mag HTTP gebruiken). Registreer de exacte website-origin met afsluitende `/` als SPA-redirect in Entra. Deze waarden zijn geen secrets. Zonder configuratie of geldige aanmelding wordt geen voorbeelddata getoond. De API controleert rollen en teamtoewijzingen; UI-zichtbaarheid is geen beveiliging.

De productiebuild stopt bij ontbrekende/ongeldige Entra-ID's of een ongeldig
API-adres. Geef deze waarden mee in hetzelfde proces als de build of via een
lokale Vite-omgeving; PowerShell-aanroepen delen hun procesvariabelen niet.
Controleer de aanmeldconfiguratie ook in de gepubliceerde app.

Instellingen en de warming-upchecklist worden lokaal per team op het apparaat bewaard. Voor het eerste gebruik moeten de bestaande catalogus en eventuele door de club vastgestelde leeftijdsdoelen in Cosmos zijn geïmporteerd; de app verzint die doelen niet. Het leeftijdsfilter in de catalogus is informatief, omdat categorie-/skillkoppelingen nog ontbreken. Aanmelden, het volledige HB3-programma en video afspelen zijn live bevestigd; aanvullende apparaat- en roltests staan in de [controlelijst bij de gebruikershandleidingen](../docs/controlelijst-handleidingen.md).

Materiaalkeuzes voor ballen en handschoenen gebruiken de catalogus-ID's
`balls` en `gloves`. De oude lokale keuze `ballen` wordt bij laden en
genereren omgezet naar `balls`, zodat passende oefeningen worden gevonden.
Als de generator een training niet volledig kan vullen, toont de PWA de
validatiemelding van de API; er wordt dan geen gedeeltelijk programma opgeslagen.

YouTube-video's laden pas na een bewuste klik via `youtube-nocookie.com`.
De iframe gebruikt expliciet `strict-origin-when-cross-origin`: YouTube
vereist een `Referer` om de insluitende website te identificeren (fout 153
bij ontbreken). Alleen de website-origin, niet het paginapad, gaat mee bij
deze cross-origin aanvraag; de algemene hostpolicy hoeft niet ruimer.
Een gewone YouTube-link blijft beschikbaar wanneer een video of browser
insluiten blokkeert.

## Clubkleuren en PWA-iconen

Het thema gebruikt zwart (`#111111`), clubrood (`#C92E32`) en donkerrood
(`#991F24`) met neutrale oppervlakken. Kleine accentteksten gebruiken donkerrood
voor voldoende contrast op lichtrode vlakken. De donkere weergave blijft
beschikbaar met witte tekst en neutrale donkere vlakken; kleine accentteksten
worden daar wit gehouden voor leesbaarheid. De standaardkleuren staan als CSS-tokens in
`src/app.css`.
Statuskleuren staan los van de clubaccenten: groen (`#26834A`) voor afgerond,
oranje (`#D58A00`) voor waarschuwingen, rood (`#B42318`) voor fouten en blauw
(`#2878B5`) voor informatie. De bestaande voltooid-badge gebruikt groen en
foutmeldingen gebruiken de foutkleur; de overige tokens zijn beschikbaar voor
bijbehorende statussen.

Plaats broniconen in `static/icons`, niet in de gegenereerde map `build`.
`static/manifest.webmanifest` verwijst afzonderlijk naar de gewone Android-
iconen en de aangeleverde maskable varianten (192 en 512 pixels).
`src/app.html` verwijst naar de PNG-favicons en het 180-pixel Apple-touch-icoon
voor iPhone/iPad. Het clublogo staat ook in de navigatiebalk. De serviceworker
neemt deze statische bestanden mee in de app-shell.

Controleer na publicatie het beginschermicoon op echte Android- en
iOS-apparaten. Bestaande installaties kunnen oude iconen vasthouden; opnieuw
toevoegen aan het beginscherm kan nodig zijn. Alleen lokaal bestanden wijzigen
werkt de gepubliceerde PWA niet bij.

Gebruik bij publicatie naar Azure Static Web Apps de versiebeheerde
`staticwebapp.config.json` uit deze map: kopieer die naast de buildbestanden
in de publicatiemap en wijs de SWA CLI daar expliciet op met
`--swa-config-location <publicatiemap>`. De configuratie behoudt de SPA-fallback
naar `200.html` en serveert `.webmanifest` als `application/manifest+json`.
Houd deze hostconfiguratie buiten `static/`, zodat de serviceworker haar niet
probeert te cachen: Azure maakt het configuratiebestand niet publiek.

Een TC-lid kan onder Beheer per leeftijdscategorie clubdoelen en vaardigheidsleerlijnen vaststellen. Elke wijziging maakt een nieuwe versie; bestaande seizoenssamenstellingen blijven op hun oude versie staan. De vaardigheids-ID moet overeenkomen met een catalogustag om oefeningen te selecteren. Leeftijdsovergangen worden niet automatisch bepaald; de TC legt de doelen per categorie vast.

Daarnaast kan de TC onder **Beheer > Skills > Ontwikkelleerlijn voor de club** een afzonderlijk
ontwikkelmodel als JSON laden. Laden schrijft niets weg; **Bewaar nieuwe
versie** slaat de huidige inhoud op zonder concepten automatisch goed te
keuren. Naam, omschrijving, status en criteriumteksten zijn in het formulier
te wijzigen; de JSON-editor bevat alle overige gegevens. Vaardigheids- en
clubdoelen tonen de leeftijdsband vooraan en staan in de volgorde van de
leeftijdsbanden (`sortOrder`). Het leeftijdsbandfilter beperkt alleen de
weergave: verborgen doelen en bewerkingen blijven bij opslaan behouden.
De namen in het bronmodel veranderen hierdoor niet. Bij
**Ontwikkeldoelen voor dit teamseizoen** kan de TC of toegewezen trainer
doelen voor overlappende leeftijdsbanden kiezen en teamafwijkingen opslaan.
Eerder opgeslagen keuzes houden hun versie; een nieuwere versie moet bewust
worden gekozen en opgeslagen. Deze doelen beïnvloeden de bestaande
oefeningenselectie nog niet.

Trainerbeheer onder **Beheer > Users** gebruikt Microsoft Graph met gedelegeerde rechten
van de aangemelde Entra-beheerder: `User.Read.All`, `User.Invite.All`,
`Application.Read.All` en `AppRoleAssignment.ReadWrite.All`. Registreer deze
scopes op de frontend-appregistratie en verleen gericht toestemming voor de
beheerder; `AppRoleAssignment.ReadWrite.All` is tenantbreed krachtig binnen
de rechten van die gebruiker. Voor de zoekactie en toekenning moet de
beheerder de benodigde Entra-rol hebben. Gasten accepteren de uitnodiging en
melden zich daarna aan. Bij gedeeltelijk mislukte acties geeft de interface
aan welke stappen mogelijk al zijn uitgevoerd; door opnieuw te zoeken kan de
beheerder veilig verder. Verwijderen van een teamkoppeling verwijdert de
Entra-gebruiker of approl niet.

Onder **TC-leden beheren** kan dezelfde Entra-beheerder een TC-rol toekennen
aan een bestaande gebruiker of uitgenodigde gast. De rol geldt clubbreed,
behoudt eventuele Trainer-rollen en teamkoppelingen, en verleent geen
Entra-beheerrechten. Een TC-rol intrekken gebeurt voorlopig via Entra;
bestaande toegangstokens kunnen tot hun vervaldatum geldig blijven.
