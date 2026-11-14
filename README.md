# Honkbal Trainer

Een Nederlandstalige progressive web app voor honkbaltrainers en technische commissies. Trainers zoeken oefeningen, bereiden trainingen voor en beheren teamdoelen. De app ondersteunt meerdere teams in Beeball, U12, U15, U21 en senioren.

## Gebruikershandleidingen

- [Handleiding voor de Technische Commissie](docs/handleiding-tc.md)
- [Handleiding voor trainers](docs/handleiding-trainers.md)
- [Verificatie, nog te testen onderdelen en bekende beperkingen](docs/controlelijst-handleidingen.md)

## Wat zit erin?

- Een doorzoekbare oefencatalogus met materiaal, uitleg en links naar video's.
- Seizoensplanning, trainingsoverzichten en iCalendar-export.
- Clubdoelen en vaardigheidsleerlijnen per leeftijdscategorie, versiebeheer en teamspecifieke seizoensdoelen.
- Microsoft-aanmelding. Trainers mogen teamgegevens lezen; wijzigingen zijn beperkt tot toegewezen teams. TC-leden beheren teams, trainerkoppelingen en clubdoelen.
- Lokale browseropslag voor persoonlijke apparaatinstellingen en warming-upchecklists. Geauthenticeerde API-antwoorden worden niet offline gecachet.

De TC bepaalt de inhoud van de leerlijn zelf. Vaardigheids-ID's moeten overeenkomen met de tags in de oefencatalogus om oefeningen voor een programma te kunnen selecteren. Leeftijdsovergangen worden niet automatisch bepaald. Het leeftijdsfilter van de catalogus is nog informatief.

### Ontwikkelleerlijn

De ontwikkelleerlijn staat naast de bestaande leerlijn en teamdoelen. Een TC-lid
kan onder **Beheer > Skills** een afzonderlijk aangeleverd JSON-bestand laden, bekijken
en bewust opslaan; alleen laden importeert niets. Nieuwe versies behouden de
doelstatus en overschrijven eerdere versies niet. De TC kan doelen bewerken in
het formulier; het volledige model, inclusief leeftijdsbanden, vaardigheden,
criteria en koppelingen, is via de JSON-editor te wijzigen. Het bestand met
conceptgegevens is niet opgenomen in deze repository.

Bij een teamseizoen verschijnen doelen uit alle actieve leeftijdsbanden die
de teamcategorie overlappen, inclusief grensleeftijden. Een toegewezen trainer
of TC-lid kan doelen activeren en teamafwijkingen vastleggen. De teamkeuze
blijft aan de gekozen modelversie verbonden totdat expliciet een nieuwere
versie wordt gekozen en opgeslagen. Dat verandert geen centrale doelen of
bestaande seizoenssamenstellingen. Met de aangeleverde banden valt Beeball
onder 6 jaar buiten de 6–8-band; 16+ wordt bij U21 en senioren gebruikt. Er is
geen individuele spelersregistratie.

De ontwikkeldoelen worden nog niet gekoppeld aan oefeningen of gebruikt voor
trainingsgeneratie: de vaardigheids-ID's verschillen van de catalogustags.
Conceptdoelen en streefwaarden zijn voorstellen, geen gevalideerde normen.
Controleer de inhoud vóór gebruik en sla geen persoonsgegevens van
jeugdspelers op in notities.

Bij een nieuwe club zonder teams kan een TC-lid het eerste team en seizoen aanmaken via **Beheer**. De oefencatalogus is ook zonder team beschikbaar.

### Trainers toevoegen

Een TC-lid met de benodigde Entra-beheerrechten kan onder **Beheer > Users** een
e-mailadres zoeken en een gevonden gebruiker aan het actieve team koppelen.
Voor een onbekend adres kan diegene na bevestiging een gast uitnodigen; de app
kent de Trainer-rol toe en koppelt de gebruiker aan het team. Het uitnodigen,
rol toekennen en koppelen zijn afzonderlijke stappen: bij een fout meldt de
app wat mogelijk al is gebeurd; zoek opnieuw voordat je verdergaat. Verwijderen
ontkoppelt alleen het team en verwijdert niet de gast of de Trainer-rol.
Bestaande koppelingen blijven werken; via **Toon namen en e-mailadressen**
kunnen object-ID's worden opgezocht.

Een Entra-beheerder kan onder **TC-leden beheren** ook een bestaande gebruiker
op e-mailadres de TC-rol toekennen of een gast uitnodigen. De TC-rol geldt
voor de hele club: TC-leden kunnen doelen en trainingen van alle teams
wijzigen, clubdoelen beheren en teams en trainerkoppelingen beheren. De rol
wijzigt bestaande Trainer-rollen en teamkoppelingen niet en geeft geen
Entra-beheerdersrechten. Intrekken van de TC-rol gaat voorlopig via Entra;
een toegangsverandering is mogelijk pas na vernieuwing van het aanmeldtoken
zichtbaar.

De frontend gebruikt hiervoor namens de aangemelde beheerder gedelegeerde
Microsoft Graph-rechten `User.Read.All`, `User.Invite.All`,
`Application.Read.All` en `AppRoleAssignment.ReadWrite.All`. Deze laatste
toestemming is ruim en kan roltoewijzingen in de tenant beheren: beperk de
toestemming tot de aangewezen beheerder, bescherm dit account met MFA en
controleer de Entra-auditlogs. De gebruiker moet daarnaast de toepasselijke
Entra-beheerrol hebben; een TC-applicatierol alleen geeft geen Graph-rechten.
Gastuitnodigingen moeten in de tenant zijn toegestaan. E-mailadressen van
trainers zijn persoonsgegevens. Geen Graph-clientsecret is nodig.

## Technologie

De frontend in `app/` gebruikt SvelteKit, TypeScript, Vite en MSAL. De API in `api/` gebruikt Azure Functions, TypeScript en Microsoft Entra ID. Azure Cosmos DB bewaart teamgegevens en referentiegegevens. `shared/` bevat gedeelde types en validatie. Vitest verzorgt de tests. De PWA wordt gehost op Azure Static Web Apps en de API op Azure Functions; actuele uitrolconfiguratie en lokale sessiegegevens staan bewust niet in deze openbare repository.

## Lokaal ontwikkelen

Benodigd: Node.js 22.12 of nieuwer, npm en voor een volledige lokale API-omgeving een compatibele Azure Functions-host, Cosmos DB-emulator en Azurite. Configureer eigen Entra-appregistraties en omgeving; er bestaat geen bypass voor authenticatie. Zie [de frontendhandleiding](app/README.md), [de API-handleiding](api/README.md) en [.env.example](.env.example). Deel geen echte credentials of lokale instellingen.

```powershell
npm install
npm run build
npm run check
npm test
```

De oefencatalogus in `data/nl/` is niet in deze openbare repository opgenomen zolang publicatierechten voor de gebruikte bronnen niet zijn vastgesteld. Catalogusimport vereist een afzonderlijk aangeleverde catalogus in die map; de tests gebruiken zelf testgegevens. Zodra de catalogus beschikbaar is:

```powershell
# Alleen controleren; schrijft geen gegevens
npm run catalog:import --workspace honkbal-trainer-api

# Pas na inrichting van Cosmos en data-plane rechten:
# stel COSMOSDB_ENDPOINT (HTTPS) en eventueel COSMOSDB_DATABASE in
npm run catalog:import --workspace honkbal-trainer-api -- --apply
```

De import gebruikt Azure-identiteit, niet een accountkey, en overschrijft bij herhaling het bestaande catalogusdocument. Een bestaande catalogus met een andere documentidentiteit wordt niet overschreven.

## Status en privacy

De implementatie is lokaal getest, maar echte aanmelding, database-integratie en productiehosting zijn nog niet end-to-end geverifieerd. De catalogus en clubdoelen moeten vóór gebruik worden ingericht. Gebruik geen persoonsgegevens van jeugdspelers. De `.gitignore` sluit lokale configuratie, secrets, sessiedata, de catalogus en omgevingsspecifieke infrastructuur uit; controleer wijzigingen altijd vóór publicatie.

## Licentie

Zie [LICENSE](LICENSE). Deze licentie verleent geen rechten op afzonderlijk aangeleverde catalogusinhoud of externe videobronnen.
