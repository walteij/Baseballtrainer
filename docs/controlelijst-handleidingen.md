# Controlelijst bij de gebruikershandleidingen

Onderzoeksdatum: 13 november 2026.

Bij de [TC-handleiding](handleiding-tc.md) en [trainershandleiding](handleiding-trainers.md).

## 1. Daadwerkelijk geverifieerd

### Huidige implementatie en documentatie gelezen

- [x] Navigatie, aanmelden, teamkeuze en exacte scherm- en knopnamen.
- [x] TC-beheer van teams, seizoenen, trainers en TC-rollen; aanvullende Microsoft-beheerrechten blijven vereist.
- [x] Trainers kunnen teamgegevens lezen; wijzigen vraagt een teamkoppeling of TC-rol.
- [x] Verschil tussen bestaande leerlijn, seizoensdoelen, nieuw ontwikkelmodel en teamontwikkelkeuzes.
- [x] Doelstatussen, leeftijdssortering, weergavefilter, modelversies en teamafwijkingen.
- [x] Leeftijdsbanden worden op overlap met teamcategorieën aangeboden, inclusief grensleeftijden.
- [x] Programmageneratie maakt twaalf wekelijkse sessies en voegt een nieuw programma toe.
- [x] Generatie gebruikt bestaande leerlijnvaardigheden, catalogustags, materiaal, indoor-/faciliteitsfilters en herhaaltermijnen binnen het nieuwe programma.
- [x] De generator slaat bij onvoldoende vulling geen gedeeltelijk programma op.
- [x] Instellingen, actief team, weergavevoorkeur en warming-upchecklist worden lokaal bewaard.
- [x] De warming-upchecklist volgt de eerste nog niet voltooide sessie van het actieve team.
- [x] Sessievoltooiing en teamdoelen worden via de API gedeeld opgeslagen.
- [x] Samenvatting, WhatsApp-voorinvulling en export van één sessie als iCalendar.
- [x] Serviceworker bewaart geen beveiligde API-antwoorden; er is geen offline schrijfwachtrij.

### Live waargenomen of eerder in deze sessie bevestigd

- [x] Aangemelde app met actief team en drilldetail waargenomen.
- [x] Ingesloten YouTube-speler en **Open video op YouTube** live aanwezig.
- [x] Gebruiker bevestigde na de laatste publicatie: app werkt, HB3 volledig en video speelt.
- [x] De twaalf bestaande HB3-sessies zijn eerder persistent teruggelezen als complete trainingen van 90 minuten, met behoud van IDs en voortgang.
- [x] De gebruiker bevestigde herstel van de eigen zakelijke aanmelding.

Deze eerdere controles zijn geen nieuwe schrijfproeven voor de handleidingen. Voor dit document zijn geen productiegegevens, rechten of applicatie-instellingen gewijzigd.

## 2. Nog te bevestigen met praktijktests

- [ ] Installatie en gebruik op de daadwerkelijk gebruikte Android-, iPhone- en iPad-apparaten; browserlabels verschillen.
- [ ] Nieuwe gastuitnodiging tot en met succesvolle eerste aanmelding, met een testaccount en benodigde toestemming.
- [ ] Trainer- en TC-werkwijze op elk eigen type account; de huidige browser is geen volledige rolwisseltest.
- [ ] WhatsApp-verzending en iCalendar-import in de agenda-apps die de vereniging gebruikt.
- [ ] Offlinegedrag op de doelapparaten; volledige offlinefunctionaliteit wordt nadrukkelijk niet beloofd.
- [ ] Schermafbeeldingen zonder echte namen, adressen, accountgegevens of andere persoonsgegevens.
- [ ] Sportinhoudelijke beoordeling door de TC van doelen, beheerscriteria en streefpercentages.

De handleidingen gebruiken placeholders in plaats van onbeoordeelde schermafbeeldingen. Beheeracties zijn niet opnieuw uitgevoerd om alleen documentatie te maken. Niet alle beheerschermen zijn tijdens dit documentatieonderzoek opnieuw live doorlopen; hun uitleg is aan de huidige schermcode en API getoetst.

## 3. Bekende beperkingen voor gebruikers

- Actieve ontwikkeldoelen sturen de generator op categorieniveau met prioriteitsvoorkeur; welke oefeningen in aanmerking komen, bepaalt nog steeds de bestaande leerlijn van de teamcategorie.
- De generator gebruikt voor die sturing de opgeslagen modelversie van de ontwikkelkeuzes van het seizoen dat bij het startjaar hoort.
- Bij een leeftijdsovergang toont Beheer een rapport van basisvaardigheden die terugkomen in de nieuwe categorie en of actieve seizoensdoelen ze dekken; er is geen individuele spelersregistratie of automatische bewaking van behaalde vaardigheden.
- Goedkeuren van een doel is niet hetzelfde als behalen door spelers of het aanbieden in een training.
- Geen automatisch ervaringsniveau-, werkelijke plafondhoogte-, vakantie- of fasewisselfilter.
- Herhaaltermijnen worden binnen het nieuw gegenereerde programma bijgehouden, niet over eerdere programma's heen.
- Opnieuw genereren voegt een programma toe en vervangt bestaande sessies niet.
- Geen algemene zichtbare editor om trainingsblokken, losse data of teamnamen aan te passen.
- Het leeftijdsfilter in de drillcatalogus is informatief; het leeftijdsbandfilter in het centrale ontwikkelmodel werkt wel.
- De banddekking hangt van het geladen model af. Jonge Beeball-spelers kunnen buiten de aangeleverde banden vallen; een open band kan door U21 en Senioren worden gedeeld.
- Teamkeuzes kunnen conceptdoelen bevatten; actief maken keurt een centraal doel niet goed.
- Instellingen en warming-upvinkjes worden niet tussen apparaten of trainers gesynchroniseerd.
- De warming-upchecklist hoort bij de eerste open sessie, niet noodzakelijk de sessie die net geopend was.
- iCalendar-export is een bestand voor één training, geen automatisch bijgewerkt agenda-abonnement.
- Een team ontkoppelen verwijdert het Microsoft-account of de approl niet; TC-rollen intrekken gaat via Microsoft-beheer.
- De app is geen volledig offline trainingsdossier.

## 4. Onderzoeksbronnen

- [Hoofddocumentatie](../README.md) en [frontenddocumentatie](../app/README.md).
- [Pagina's en gebruikershandelingen](../app/src/lib/components/AppPage.svelte).
- [Navigatie, aanmelden en teamkeuze](../app/src/routes/+layout.svelte).
- [Trainerbeheer](../app/src/lib/components/TrainerManager.svelte) en [TC-rollen](../app/src/lib/components/CommitteeManager.svelte).
- [Bestaande leerlijn](../app/src/lib/components/CurriculumEditor.svelte).
- [Ontwikkelmodel](../app/src/lib/components/DevelopmentEditor.svelte) en [teamontwikkeldoelen](../app/src/lib/components/DevelopmentTeamGoals.svelte).
- [API-client en lokale instellingen](../app/src/lib/api/liveClient.ts).
- [Generator](../api/src/services/programs.ts), [teamrechten](../api/src/services/teamAccess.ts) en [sessievoltooiing](../api/src/functions/updateSessionCompletion.ts).
- [Delen en agenda-export](../app/src/lib/services/share.ts), [offlinegedrag](../app/src/service-worker.ts) en [leeftijdsoverlap](../shared/types/developmentAgeGroups.ts).
