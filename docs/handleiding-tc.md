# Honkbal Trainer - handleiding voor de TC

Stand: 13 november 2026.

Website: <https://honkbaltrainer.wmsl.eu>

Deze handleiding beschrijft de huidige applicatie, niet de gewenste toekomstige werking. Zie ook de [trainershandleiding](handleiding-trainers.md) en de [verificatie- en beperkingenlijst](controlelijst-handleidingen.md).

## 1. Waarvoor gebruik je de app?

De Technische Commissie (TC) beheert teams, trainerkoppelingen, clubbrede leerlijnen en doelen. De app ondersteunt meerdere teams in **Beeball, U12, U15, U21 en Senioren**.

De TC kan ook trainingen en teamdoelen van alle teams wijzigen. Trainers gebruiken dezelfde app voor hun voorbereiding en trainingen.

> Voer geen persoonsgegevens van jeugdspelers in. Gebruik ook in vrije notitievelden geen namen, medische informatie of individuele spelersdossiers.

### Wie mag wat?

| Onderdeel | Trainer | TC |
|---|---|---|
| Catalogus en teamgegevens lezen | Ja, ook van andere teams | Ja |
| Programma genereren, sessie voltooien en teamseizoendoelen opslaan | Alleen voor toegewezen teams | Voor alle teams |
| Teams en seizoenen aanmaken, trainerkoppelingen beheren | Nee | Ja |
| Centrale leerlijnen vaststellen of bewaren | Nee | Ja |
| In Microsoft gebruikers zoeken, gasten uitnodigen en approllen toekennen | Niet via trainerbeheer | Alleen met aanvullende Entra-beheerrechten |

**Belangrijk:** de TC-rol in Honkbal Trainer maakt iemand geen Microsoft Entra-beheerder. Omgekeerd is een teamkoppeling geen toestemming om bij de app aan te melden.

## 2. Snel aan de slag in vijf minuten

1. Open de website en kies **Aanmelden**.
2. Gebruik het account waarvoor je toegang hebt gekregen.
3. Kies bovenaan bij **Actief team** bijvoorbeeld U15 of HB3.
4. Open **Beheer > Users** om teams en trainerkoppelingen te controleren.
5. Open **Beheer > Skills** om leerlijnen en doelen te bekijken.
6. Controleer bij **Kalender** eerst of er al trainingen bestaan. Genereer niet opnieuw als je alleen iets wilt controleren.

[Screenshot gewenst: hoofdnavigatie met Actief team en de tabbladen Users en Skills, zonder persoonsgegevens]

## 3. Aanmelden en toegang regelen

### Eerste aanmelding als gast

1. Open de ontvangen Microsoft-gastuitnodiging.
2. Accepteer die met precies het account waarvoor je bent uitgenodigd.
3. Rond eventuele extra verificatie af. Microsoft kan vragen om meervoudige verificatie, oftewel MFA, in te stellen.
4. Open de app en kies **Aanmelden**.

Bij nieuwe rechten kan **Afmelden** en opnieuw aanmelden nodig zijn.

### Trainers helpen bij toegangsproblemen

Controleer deze drie zaken afzonderlijk:

1. **Account:** is de juiste gast aanwezig, actief en is de uitnodiging geaccepteerd?
2. **Approl:** heeft de gebruiker de Trainer-rol of TC-rol voor de applicatie?
3. **Teamkoppeling:** is de trainer gekoppeld aan het team dat diegene moet wijzigen?

De Microsoft-beheerder controleert de eerste twee punten en eventuele MFA-problemen. De TC controleert de teamkoppeling. Een gebruiker kan wel kunnen lezen maar geen toestemming hebben om een team te wijzigen.

Bij een melding over een onbekend of niet toegewezen account: maak niet meteen een tweede gebruiker aan. Laat eerst het gebruikte account en de uitnodiging controleren.

## 4. Teams en trainers beheren

### Team voor een seizoen aanmaken

1. Open **Beheer > Users**.
2. Zoek **Team voor seizoen aanmaken**.
3. Vul **Teamnaam** en **Seizoenjaar** in.
4. Kies **Leeftijdsgroep**: Beeball, U12, U15, U21 of Senioren.
5. Kies **Maak team voor seizoen**.
6. Controleer de melding en het actieve team.

Bij exact dezelfde bestaande teamnaam en leeftijdscategorie gebruikt de app dat team voor het nieuwe seizoen. Controleer eerst of het bedoelde team en seizoen al bestaan.

Geeft de app aan dat het team wel is gemaakt maar het seizoen niet? Controleer de huidige situatie voordat je opnieuw begint. Deze gebruikersinterface bevat geen algemene functie om bestaande teams te hernoemen of te verwijderen.

### Bestaande trainer koppelen

1. Selecteer bovenaan het juiste **Actief team**.
2. Ga naar **Beheer > Users**, onderdeel **Trainers koppelen**.
3. Vul **E-mailadres trainer** in en kies **Zoek trainer**.
4. Controleer de gevonden gebruiker.
5. Kies **Koppel bestaande gebruiker**.
6. Controleer de succesmelding.

Deze actie regelt zowel de Trainer-rol als de koppeling aan het gekozen team. Voor het Microsoft-gedeelte zijn aanvullende Entra-beheerrechten nodig.

### Nieuwe gast uitnodigen en koppelen

1. Zoek de trainer zoals hierboven.
2. Controleer het adres als er geen gebruiker is gevonden.
3. Kies **Nodig gast uit en koppel**.
4. Laat de trainer de uitnodiging accepteren en eventuele MFA afronden.
5. Laat de trainer opnieuw aanmelden en de toegang controleren.

Een melding dat Entra de uitnodiging heeft geaccepteerd betekent dat de uitnodigingsaanvraag is verwerkt; niet dat de trainer de uitnodiging al heeft aangenomen.

Uitnodigen, de rol toekennen en het team koppelen zijn afzonderlijke stappen. Lees bij een fout welke stap mogelijk al gelukt is. **Zoek opnieuw** voordat je verdergaat.

### Koppeling bekijken of verwijderen

- Kies **Toon namen en e-mailadressen** als je alleen technische identificaties ziet. Hiervoor zijn Microsoft-beheerrechten nodig.
- Kies **Verwijderen** bij een koppeling om die trainer van het actieve team los te maken.
- Dit verwijdert niet het Microsoft-account, de Trainer-rol of koppelingen aan andere teams.
- Toegang tot de app volledig intrekken vraagt een afzonderlijke actie door de Microsoft-beheerder.

[Screenshot gewenst: Trainers koppelen met fictieve of afgeschermde accountgegevens]

### TC-lid toevoegen

Onder **TC-leden beheren**:

1. Vul **E-mailadres TC-lid** in en kies **Zoek TC-lid**.
2. Controleer de gevonden gebruiker of het uitnodigingsadres.
3. Kies **Ken TC-rol toe** of **Nodig gast uit en ken TC-rol toe**.

Geef deze rol alleen aan iemand die clubbreed mag wijzigen. Bestaande Trainer-rollen en teamkoppelingen blijven behouden. Een TC-rol intrekken gebeurt voorlopig via de Microsoft-beheerder, niet met een knop in de app.

## 5. Begrijp eerst de verschillende soorten doelen

In **Beheer > Skills** staan verschillende onderdelen naast elkaar.

| Schermonderdeel | Waarvoor? | Invloed op trainingsgeneratie |
|---|---|---|
| **Clubdoelen en vaardighedenleerlijn** | Bestaande leerlijn per teamleeftijdscategorie | De generator gebruikt de vaardigheids-ID's uit de actuele leerlijn, gekoppeld aan catalogustags |
| **Doelen samenstellen** | Generieke en eigen doelen voor een teamseizoen bewaren | De geselecteerde doelteksten sturen de oefeningenselectie niet |
| **Ontwikkelleerlijn voor de club** | Nieuw ontwikkelmodel met leeftijdsbanden, vaardigheidsdoelen, clubdoelen en criteria | Alleen via actieve teamkeuzes (zie hieronder); het model zelf selecteert geen oefeningen |
| **Ontwikkeldoelen voor dit teamseizoen** | Keuzes en afwijkingen van het nieuwe model voor een teamseizoen | Actieve doelen geven oefeningen in hun categorieën voorrang, op volgorde van prioriteit |

Het vaststellen of goedkeuren van een nieuw ontwikkeldoel maakt dat doel dus niet automatisch onderdeel van een training: alleen actieve teamkeuzes sturen de volgorde, en de bestaande leerlijn bepaalt welke oefeningen in aanmerking komen.

## 6. Bestaande clubdoelen en vaardighedenleerlijn vaststellen

1. Open **Beheer > Skills**.
2. Zoek **Clubdoelen en vaardighedenleerlijn**.
3. Kies **Leeftijdscategorie**.
4. Kies desgewenst **Laad clubvoorstel** om de editor te vullen met het clubvoorstel voor die categorie (onder andere een uitgewerkte U15-leerlijn). Laden slaat nog niets op en vervangt de huidige editorinhoud.
5. Controleer of bewerk de vaardigheden:
   - **Vaardigheids-ID**: gebruik een bestaande skilltag uit de oefencatalogus.
   - **Naam**, **Omschrijving**, **Niveau (1–10)** en **Doel voor deze leeftijd**.
6. Gebruik zo nodig **Vaardigheid toevoegen** of **Verwijder vaardigheid**.
7. Bewerk bij **Leeftijdsdoelen** de tekst en bijbehorende **Vaardigheids-ID's (komma-gescheiden)**. Gebruik **Doel toevoegen** of **Verwijder doel** waar nodig.
8. Kies **Stel leerlijn vast**.
9. Controleer de melding met het nieuwe versienummer.

Er moeten doelen en vaardigheden aanwezig zijn om te kunnen vaststellen. Elke opslag maakt een nieuwe versie; bestaande seizoensdoelen blijven ongewijzigd.

> Het veld Niveau is geen automatisch moeilijkheidsfilter van de generator. De generator selecteert op vaardigheidstags, benodigd materiaal, binnenruimte, faciliteiten en herhaaltermijnen.

## 7. Nieuw ontwikkelmodel beheren

### Laden en bewaren

1. Ga naar **Ontwikkelleerlijn voor de club**.
2. Gebruik **JSON-bestand laden** voor een daarvoor voorbereid ontwikkelmodel.
3. Controleer de inhoud. Alleen laden slaat nog niets op.
4. Bewerk de gewenste doelen.
5. Kies **Bewaar nieuwe versie** en controleer de melding.

De opgeslagen versie blijft behouden als je een bestand als nieuwe bewerking laadt. Niet-opgeslagen bewerkingen kunnen daarbij wel worden vervangen.

### Leeftijdssortering en filter

- Bij **Vaardigheidsdoelen** en **Clubdoelen** staat de leeftijdsband vooraan.
- De onderdelen zijn op de volgorde van de leeftijdsbanden gesorteerd.
- Met **Filter op leeftijdsband** toon je één band of **Alle leeftijdsbanden**.
- Het filter verbergt alleen onderdelen. Verborgen doelen en hun bewerkingen blijven behouden bij opslaan.

Teamcategorieën zoals U15 zijn niet hetzelfde als de leeftijdsbanden van dit model. Bij teamkeuzes gebruikt de app overlappende banden, ook bij grensleeftijden.

### Doelen en statussen

Open een doel om **Naam**, **Omschrijving**, **Status** en **TC-notitie** te bewerken. Bij vaardigheidsdoelen kun je de tekst van **Beheerscriteria** aanpassen; bij clubdoelen ook **Prioriteit**.

| Keuze in Status | Mogelijke tekst in overzicht | Betekenis |
|---|---|---|
| Concept | `draft` | Voorstel dat nog inhoudelijk beoordeeld moet worden |
| Goedgekeurd | `approved` | Door de TC als goedgekeurd gemarkeerd |
| Gearchiveerd | `archived` | Niet als actief teamdoel te gebruiken |

**Bewaar nieuwe versie** wijzigt statussen niet automatisch. Conceptdoelen kunnen als voorstel voor een team worden gekozen: een actieve teamkeuze is geen centrale goedkeuring. Een status is ook geen bewijs dat spelers iets beheersen.

### Leeftijdsbanden, vaardigheden en overige modelgegevens

De gewone doelvelden bieden geen volledige modelbewerking. Gebruik daarvoor **Bewerk volledig model als JSON**. Daar zijn ook leeftijdsbanden, vaardigheden, beoordelingscriteria en koppelingen aanpasbaar.

Laat dit doen door iemand die het model begrijpt. Controleer de invoer met **Pas JSON toe en toon formulier** en sla daarna bewust op met **Bewaar nieuwe versie**. Ongeldige inhoud geeft een foutmelding.

[Screenshot gewenst: leeftijdsbandfilter en een open vaardigheidsdoel met Status en Beheerscriteria]

## 8. Doelen voor een teamseizoen kiezen

Selecteer eerst **Actief team** en in **Doelen samenstellen** het juiste **Seizoen**.

### Bestaande seizoensdoelen

1. Vink de gewenste generieke doelen aan.
2. Vul eventueel **Nieuw teamdoel** in.
3. Kies **Voeg teamdoel toe**.
4. Kies **Bewaar doelen voor seizoen**.

Er moeten generieke doelen voor de leeftijdscategorie beschikbaar zijn. Bestaande samenstellingen blijven aan hun eerder gekozen versie gekoppeld.

### Nieuwe ontwikkeldoelen

1. Zoek **Ontwikkeldoelen voor dit teamseizoen**.
2. Controleer de leerlijnversie en de getoonde leeftijdsbanden.
3. Open een doel en vink **Actief voor dit team** aan.
4. Stel zo nodig **Prioriteit (1–5)** en **Traineropmerking** in.
5. Gebruik eventueel **Eigen naam**, **Eigen omschrijving** of **Eigen streefpercentage** voor een teamafwijking.
6. Kies **Bewaar ontwikkeldoelen**.

Deze afwijkingen veranderen de centrale leerlijn niet. Een streefpercentage is een planningsafspraak, geen automatisch berekende spelersbeoordeling.

Actieve doelen sturen de trainingsgenerator: oefeningen in de categorieën van die doelen krijgen voorrang, waarbij prioriteit 1 het zwaarst weegt. De bestaande leerlijn blijft bepalen welke oefeningen in aanmerking komen.

### Leeftijdsovergang controleren

Heeft het gekozen seizoen een andere leeftijdscategorie dan het vorige seizoen van het team, dan toont **Ontwikkeldoelen voor dit teamseizoen** bovenaan het rapport **Leeftijdsovergang**. Het rapport somt de basisvaardigheden uit de leerlijn op die in beide categorieën voorkomen, met het oude en nieuwe beheersingsniveau en de volgende stap. Per vaardigheid staat of een actief seizoensdoel haar dekt; niet-gedekte vaardigheden verdienen een extra doelkeuze. De dekking wordt opnieuw berekend na het opslaan van ontwikkeldoelen. Het rapport controleert het aanbod, niet of spelers vaardigheden daadwerkelijk beheersen.

Met **Verwijder teamkeuze** haal je alleen de teamkeuze weg. Een gearchiveerd doel kan niet actief worden opgeslagen.

Is een nieuwere centrale versie beschikbaar? Kies desgewenst **Kies nieuwere leerlijnversie …**, controleer de keuzes en sla op. Bestaande teamkeuzes gaan niet vanzelf over. Bij niet-passende keuzes meldt de app dat je de huidige versie moet behouden of keuzes moet aanpassen.

## 9. Praktijkvoorbeeld: U15 en HB3 voorbereiden

Onderstaande doelteksten zijn voorbeelden, geen verplichte sportnormen.

1. Controleer of U15 en HB3 met het bedoelde seizoen bestaan.
2. Koppel de juiste trainers aan elk team.
3. Controleer voor U15 de bestaande U15-leerlijn en voor HB3 die van Senioren. Gebruik geldige catalogustags.
4. Kies voor U15 gezamenlijke basisdoelen, bijvoorbeeld veilig gooien en vangen, en formuleer aanvullende uitdaging in de teamafspraken. Leg geen vaste spelerslabels vast.
5. Kies voor HB3 passende ontwikkeldoelen en geef ze zo nodig een eenvoudige teamomschrijving, bijvoorbeeld een rustige uitvoering met nadruk op veiligheid.
6. Bewaar de keuzes per teamseizoen. Controleer de centrale status afzonderlijk.
7. Laat de trainers bestaande trainingen in **Kalender** controleren en materiaal en ruimte nalopen.
8. Laat alleen een nieuw programma maken als dat werkelijk nodig is.

Bij de overgang van U12 naar U15 toont het rapport **Leeftijdsovergang** welke basisvaardigheden terugkomen en of actieve seizoensdoelen ze dekken. De app registreert echter geen individuele spelersloopbaan en bewaakt niet automatisch of een overgangsdoel daadwerkelijk is aangeboden of behaald. De TC moet die controle organisatorisch blijven regelen.

## 10. Veelgestelde vragen en problemen

**Een trainer ziet het team, maar kan niets opslaan.**

Controleer de teamkoppeling. Teamgegevens kunnen leesbaar zijn zonder schrijfrechten.

**Een TC-lid kan geen gebruiker zoeken of uitnodigen.**

De TC-approl alleen is onvoldoende. Vraag de Microsoft-beheerder om de benodigde beheerrechten en toestemmingen te controleren.

**Er staat dat de gegevens intussen zijn gewijzigd.**

Bewaar zo nodig je nog niet opgeslagen tekst buiten de app zonder persoonsgegevens. Laad opnieuw, controleer de nieuwe versie en pas je wijziging opnieuw toe.

**Er is geen vaardighedenleerlijn ingesteld.**

Controleer de bestaande **Clubdoelen en vaardighedenleerlijn** voor de teamcategorie. Alleen een nieuw ontwikkelmodel opslaan is niet voldoende voor de generator.

**De generator kan een training niet volledig vullen.**

Controleer de genoemde datum en ontbrekende minuten, catalogustags, materiaal, ruimte en herhaaltermijnen. Bij deze fout wordt geen gedeeltelijk nieuw programma opgeslagen. Bestaande programma's blijven staan.

**Er verschijnt een leeg scherm of oude inhoud.**

Sluit alle Honkbal Trainer-tabbladen en appvensters en open de app opnieuw met internet. Probeer op een computer zo nodig Ctrl+F5. Laat de beheerder meekijken als dit niet helpt. Wis browsergegevens niet als eerste stap: lokale instellingen en vinkjes kunnen verloren gaan.

**Een video speelt niet.**

Gebruik **Open video op YouTube**. Niet elke video of browser staat insluiten toe.

## 11. Checklist voor dagelijks gebruik

- [ ] Het juiste team en seizoen zijn geselecteerd.
- [ ] Trainers hebben zowel app-toegang als de benodigde teamkoppeling.
- [ ] Doelstatussen en versies zijn bewust gekozen en opgeslagen.
- [ ] Trainers weten welke leerlijn de generator gebruikt.
- [ ] Bestaande trainingen zijn gecontroleerd voordat iets nieuws wordt gegenereerd.
- [ ] Oefeningen zijn inhoudelijk en op veiligheid beoordeeld.
- [ ] Notities bevatten geen persoonsgegevens van jeugdspelers.
- [ ] Succes- en foutmeldingen zijn gelezen; gedeeltelijk mislukte beheeracties zijn gecontroleerd.
