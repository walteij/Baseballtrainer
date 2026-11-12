# Honkbal Trainer

Een Nederlandstalige progressive web app voor honkbaltrainers en technische commissies. Trainers zoeken oefeningen, bereiden trainingen voor en beheren teamdoelen. De app ondersteunt meerdere teams in Beeball, U12, U15, U21 en senioren.

## Wat zit erin?

- Een doorzoekbare oefencatalogus met materiaal, uitleg en links naar video's.
- Seizoensplanning, trainingsoverzichten en iCalendar-export.
- Clubdoelen en vaardigheidsleerlijnen per leeftijdscategorie, versiebeheer en teamspecifieke seizoensdoelen.
- Microsoft-aanmelding. Trainers mogen teamgegevens lezen; wijzigingen zijn beperkt tot toegewezen teams. TC-leden beheren teams, trainerkoppelingen en clubdoelen.
- Lokale browseropslag voor persoonlijke apparaatinstellingen en warming-upchecklists. Geauthenticeerde API-antwoorden worden niet offline gecachet.

De TC bepaalt de inhoud van de leerlijn zelf. Vaardigheids-ID's moeten overeenkomen met de tags in de oefencatalogus om oefeningen voor een programma te kunnen selecteren. Leeftijdsovergangen worden niet automatisch bepaald. Het leeftijdsfilter van de catalogus is nog informatief.

## Technologie

De frontend in `app/` gebruikt SvelteKit, TypeScript, Vite en MSAL. De API in `api/` gebruikt Azure Functions, TypeScript en Microsoft Entra ID. Azure Cosmos DB bewaart teamgegevens en referentiegegevens. `shared/` bevat gedeelde types en validatie. Vitest verzorgt de tests. De beoogde hosting gebruikt Azure Storage en Functions; actuele uitrolconfiguratie en lokale sessiegegevens staan bewust niet in deze openbare repository.

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
