<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { api } from '$lib/api';
  import { identity } from '$lib/auth';
  import { activeTeam } from '$lib/stores/team';
  import type { AgeGroup, Catalog, Goal, Session, Settings, Skill, Team, TeamSeason } from '$lib/api/types';
  import { dateNl } from '$lib/services/date';
  import { downloadIcal, sessionSummary, whatsapp } from '$lib/services/share';
  import Status from './Status.svelte';
  import CurriculumEditor from './CurriculumEditor.svelte';
  import DevelopmentEditor from './DevelopmentEditor.svelte';
  import DevelopmentTeamGoals from './DevelopmentTeamGoals.svelte';
  import TrainerManager from './TrainerManager.svelte';
  import CommitteeManager from './CommitteeManager.svelte';
  import { Activity, ArrowLeft, ArrowRight, CalendarDays, CheckCircle2, Clock3, Copy, Download, Dumbbell, LayoutGrid, ListChecks, MapPin, Play, Search, Send, Settings as SettingsIcon, Shield, Target, TrendingUp } from 'lucide-svelte';

  let state: 'loading' | 'error' | 'data' = 'loading';
  let error = '';
  let teams: Team[] = [];
  let sessions: Session[] = [];
  let catalog: Catalog | null = null;
  let settings: Settings | null = null;
  let skills: Skill[] = [];
  let goals: Goal[] = [];
  let genericGoals: Goal[] = [];
  let seasons: TeamSeason[] = [];
  let currentSeason = '';
  let goalVersion = 0;
  let assignments: { objectId: string }[] = [];
  let progressions: string[] = [];
  let loadedTeam: string | undefined;
  let loadedView = '';
  let generation = 0;
  let search = '';
  let category = 'alle';
  let sort = 'naam';
  let phase = 'Alle fases';
  let calendarTab = 'Lijst';
  let video = false;
  let message = '';
  let checked: string[] = [];
  let newGoal = '';
  let newTeamName = '';
  let newYear = new Date().getFullYear();
  let newAge: AgeGroup = 'U12';
  let ageFilter = 'alle';
  let skillFilter = 'alle';
  let selectedGeneric: string[] = [];
  let draftGoals: Goal[] = [];
  const equipmentLabels: Record<string, string> = { balls: 'ballen', gloves: 'handschoenen' };
  $: pathname = $page.url.pathname;
  $: management = pathname === '/beheer' || pathname.startsWith('/beheer/');
  $: skillsManagement = pathname === '/beheer/skills' || pathname === '/beheer/skills/';
  $: viewKey = management ? (skillsManagement ? 'beheer-skills' : 'beheer-users') : pathname;
  $: if (loadedTeam !== undefined && loadedView !== viewKey) void load();
  $: id = decodeURIComponent(pathname.split('/').filter(Boolean).at(-1) ?? '');
  $: admin = $identity?.isCommittee ?? false;
  $: suffix = '';
  $: team = teams.find((item) => item.id === $activeTeam);
  $: session = sessions.find((item) => item.id === id);
  $: nextSession = sessions.find((item) => !item.completed);
  $: drill = catalog?.drills.find((item) => item.id === id);
  $: visibleSessions = sessions.filter((item) => phase === 'Alle fases' || item.phase === phase);
  $: visibleDrills = (catalog?.drills ?? []).filter((item) => {
    const query = search.trim().toLocaleLowerCase('nl');
    return (category === 'alle' || item.category === category) && (!query || `${item.name_nl} ${item.category} ${item.equipment_required.join(' ')} ${item.skills.join(' ')}`.toLocaleLowerCase('nl').includes(query))
      && (skillFilter === 'alle' || item.skills.includes(skillFilter));
  }).sort((a, b) => sort === 'duur' ? a.duration_minutes.minimum - b.duration_minutes.minimum : sort === 'niveau' ? a.difficulty.localeCompare(b.difficulty) : a.name_nl.localeCompare(b.name_nl, 'nl'));
  $: skillOptions = [...new Set((catalog?.drills ?? []).flatMap((item) => item.skills))].sort();
  $: warmupSession = nextSession?.id ?? 'geen-sessie';
  $: checklistKey = `warming-up:${$activeTeam}:${warmupSession}`;

  async function load(teamId = $activeTeam) {
    const request = ++generation; loadedView = viewKey; state = 'loading'; error = ''; message = '';
    try {
      const allTeams = await api.listTeams();
      if (request !== generation) return;
      if (!allTeams.length) {
        const allCatalog = pathname === '/drills' || pathname.startsWith('/drills/') ? await api.getCatalog() : null;
        if (request !== generation) return;
        teams = []; catalog = allCatalog; sessions = []; seasons = []; assignments = []; loadedTeam = teamId; state = 'data'; return;
      }
      if (!allTeams.some(item => item.id === teamId)) { activeTeam.set(allTeams[0].id); return; }
      const [allCatalog, teamSessions, teamSettings, allSeasons] = await Promise.all([
        management ? Promise.resolve(null) : api.getCatalog(),
        management ? Promise.resolve([]) : api.listTeamSessions(teamId),
        api.getSettings(teamId), api.listTeamSeasons(teamId),
      ]);
      const current = allTeams.find((item) => item.id === teamId);
      const chosenSeason = allSeasons.find(s => s.id === currentSeason) ?? [...allSeasons].sort((a, b) => b.year - a.year)[0];
      const [teamSkills, progression, composition, generic, teamAssignments] = current
        ? await Promise.all([management ? [] : api.getTeamSkillProgress(teamId), management ? { skills: [], progressions: [] } : api.getSkillProgression(current.age_group_id), management && !skillsManagement ? null : chosenSeason ? api.getTeamSeasonGoals(teamId, chosenSeason.id) : null, management && !skillsManagement ? null : api.getAgeGroupGoals(chosenSeason?.age_group_id ?? current.age_group_id), admin && (!management || !skillsManagement) ? api.listAssignments(teamId) : []])
        : [[], { skills: [], progressions: [] }, null, null, []];
      if (request !== generation) return;
      teams = allTeams; catalog = allCatalog; sessions = teamSessions; settings = teamSettings; skills = teamSkills;
      try {
        const draft = localStorage.getItem(`settings-draft:${teamId}`);
        if (draft) { settings = JSON.parse(draft) as Settings; message = 'Een lokaal concept is hersteld; wijzigingen zijn nog niet opgeslagen.'; }
      } catch { message = 'Het lokale instellingenconcept kon niet worden hersteld.'; }
      seasons = allSeasons; currentSeason = chosenSeason?.id ?? ''; assignments = teamAssignments;
      progressions = progression.progressions; goals = composition?.goals ?? []; genericGoals = generic?.goals ?? [];
      goalVersion = composition?.ageGroupGoalVersion ?? generic?.version ?? 0;
      if (generic && goalVersion !== generic.version) {
        const historic = await api.getAgeGroupGoals(chosenSeason?.age_group_id ?? current!.age_group_id, goalVersion);
        if (request !== generation) return;
        if (!historic) throw new Error('De opgeslagen versie van de generieke doelen ontbreekt.');
        genericGoals = historic.goals;
      }
      selectedGeneric = goals.filter((g) => g.source === 'generiek').map((g) => g.id); draftGoals = goals.filter((g) => g.source === 'team');
      loadedTeam = teamId;
      try { checked = JSON.parse(localStorage.getItem(`warming-up:${teamId}:${teamSessions.find((s) => !s.completed)?.id ?? 'geen-sessie'}`) ?? '[]') as string[]; } catch { checked = []; }
      state = 'data';
    } catch (e) { if (request === generation) { error = e instanceof Error ? e.message : 'Onbekende fout'; state = 'error'; } }
  }
  function toggleCheck(key: string) {
    checked = checked.includes(key) ? checked.filter((item) => item !== key) : [...checked, key];
    localStorage.setItem(checklistKey, JSON.stringify(checked));
  }
  async function copy(sessionToCopy: Session) {
    try { await navigator.clipboard.writeText(sessionSummary(sessionToCopy)); message = 'Samenvatting gekopieerd.'; }
    catch { message = 'Kopiëren is niet gelukt. Controleer de klembordrechten.'; }
  }
  async function saveSettings() {
    if (!settings) return;
    localStorage.setItem(`settings-draft:${$activeTeam}`, JSON.stringify(settings));
    try { await api.saveSettings($activeTeam, settings); localStorage.removeItem(`settings-draft:${$activeTeam}`); message = 'Instellingen lokaal opgeslagen op dit apparaat.'; }
    catch { message = 'Opslaan mislukt — kon de API niet bereiken. Je wijzigingen staan lokaal klaar; probeer opnieuw.'; }
  }
  async function generate() {
    if (!settings) return;
    try { await api.createProgram($activeTeam, settings); await load(); message = 'Seizoensplan gegenereerd.'; }
    catch (e) { message = e instanceof Error ? e.message : 'Genereren mislukt.'; }
  }
  async function complete(item: Session) {
    try { await api.updateSessionCompletion(item.id, !item.completed, []); await load(); }
    catch (e) { message = e instanceof Error ? e.message : 'Bijwerken mislukt.'; }
  }
  async function createSeason() {
    let createdTeam = false;
    try {
      const existing = teams.find((item) => item.name === newTeamName && item.age_group_id === newAge);
      const selected = existing ?? await api.createTeam({ name: newTeamName, age_group_id: newAge });
      createdTeam = !existing;
      await api.createTeamSeason(selected.id, { year: newYear, age_group_id: newAge });
      window.dispatchEvent(new Event('teams-changed')); currentSeason = ''; activeTeam.set(selected.id); await load(selected.id); message = 'Team voor seizoen aangemaakt.';
    } catch (e) {
      if (createdTeam) { window.dispatchEvent(new Event('teams-changed')); }
      message = `${createdTeam ? 'Het team is aangemaakt, maar het seizoen niet. ' : ''}${e instanceof Error ? e.message : 'Aanmaken mislukt.'}`;
    }
  }
  async function saveGoals() {
    if (!currentSeason || !goalVersion) { message = 'Selecteer een seizoen met beschikbare generieke doelen.'; return; }
    try { await api.saveTeamSeasonGoals($activeTeam, currentSeason, { age_group_goal_version: goalVersion, selected_generic_goal_ids: selectedGeneric, team_goals: draftGoals }); await load(); message = 'Doelen opgeslagen.'; }
    catch (e) { message = e instanceof Error ? e.message : 'Opslaan mislukt.'; }
  }
  function addGoal() {
    if (newGoal.trim()) { draftGoals = [...draftGoals, { id: `draft-${crypto.randomUUID()}`, text: newGoal.trim(), source: 'team', skill_ids: [] }]; newGoal = ''; }
  }
  onMount(() => {
    const unsubscribe = activeTeam.subscribe((value) => { if (value !== loadedTeam) void load(value); });
    return unsubscribe;
  });
</script>

{#if state === 'loading'}<Status state="loading" />
{:else if state === 'error'}<Status state="error" message={error} retry={() => load()} />
{:else if !teams.length && !management && pathname !== '/drills' && !pathname.startsWith('/drills/')}<Status state="empty" message="Er zijn nog geen teams beschikbaar. Een TC-lid kan een team aanmaken bij Beheer." />
{:else if pathname === '/'}
  {#if !nextSession}<Status state="empty" message="Voor dit team staan nog geen trainingen gepland." />
  {:else}
    <section class="hero card">
      <div class="hero-content"><span class="eyebrow"><span class="dot"></span> VOLGENDE TRAINING</span>
      <h1>{team?.name} · {dateNl(nextSession.date)} {nextSession.time}</h1>
      <p>{team?.age_group_id} · {nextSession.phase} (indoor) · {nextSession.location}<br />{nextSession.focus} staat op het programma. Deel de sessie alvast met het team.</p>
      <div class="actions"><button class="btn light" onclick={() => whatsapp(nextSession)}><Send size={16}/> Deel via WhatsApp</button><a class="btn hero-secondary" href="/sessie/{nextSession.id}{suffix}">Bekijk sessie <ArrowRight size={16}/></a></div></div>
      <div class="hero-decoration" aria-hidden="true"><div class="diamond"></div><span>TRAIN<br />SAMEN.</span></div>
    </section>
    <div class="kpi-grid">
      <article class="card kpi"><span><CheckCircle2 size={16}/> Sessies voltooid</span><strong>{sessions.filter(s => s.completed).length} / {sessions.length}</strong><small>Geplande sessies</small></article>
      <article class="card kpi"><span><Activity size={16}/> Volgende fase</span><strong>{nextSession.phase}</strong><small>{team?.age_group_id}</small></article>
      <article class="card kpi"><span><Target size={16}/> Vastgelegde skills</span><strong>{skills.length}</strong><small>Teamvoortgang</small></article>
    </div>
    <div class="section-heading"><h2><Target size={19}/> Vaardigheden voor {team?.age_group_id}</h2><span>{skills.length} geregistreerd</span></div>
    <div class="skill-grid">{#each skills as skill}<article class="card"><span class="badge">Basisvaardigheid</span><h3>{skill.name}</h3><p>{skill.description}</p></article>{/each}</div>
    <div class="section-heading"><h2><CalendarDays size={19}/> Deze week & binnenkort</h2><a href="/kalender{suffix}">Volledige kalender <ArrowRight size={15}/></a></div>
    <div class="stack">{#each [nextSession, ...sessions.filter((s) => s.id !== nextSession?.id)].slice(0, 3) as item}<article class="card session-row"><div class="date-tile"><CalendarDays size={20}/><span>{dateNl(item.date)}</span></div><div class="grow"><h3><a href="/sessie/{item.id}{suffix}">{team?.age_group_id} {item.title}</a></h3><p>{item.focus} · {item.time} · {item.location}</p></div><span class:success={item.completed} class="badge">{item.completed ? 'Voltooid' : 'Gepland'}</span><ArrowRight size={18}/></article>{/each}</div>
    <div class="action-bar"><button class="btn secondary" onclick={() => downloadIcal(nextSession)}><Download size={16}/> Exporteer iCal</button><button class="btn secondary" onclick={() => copy(nextSession)}><Copy size={16}/> Kopieer samenvatting</button></div>
  {/if}
{:else if pathname === '/kalender'}
  <div class="page-title"><div><span class="eyebrow">JOUW SEIZOEN</span><h1><CalendarDays size={25}/> Trainingskalender</h1><p>{team?.name} · {team?.age_group_id}</p></div><a class="btn primary" href="/instellingen{suffix}">Programma-instellingen</a></div>
  <div class="filter-row">{#each ['Alle fases', 'Winter', 'Preseason', 'Competitie', 'Postseason'] as option}<button class:chosen={phase === option} class="chip" onclick={() => phase = option}>{option}</button>{/each}</div>
  <div class="tabs" role="tablist" aria-label="Kalenderweergave">{#each ['Lijst', 'Week', 'Maand'] as tab}<button role="tab" aria-selected={calendarTab === tab} class:chosen={calendarTab === tab} onclick={() => calendarTab = tab}>{tab}</button>{/each}</div>
  {#if !visibleSessions.length}<Status state="empty" message="Geen sessies voor deze fase en dit team." />
  {:else if calendarTab === 'Maand'}<div class="card"><h2>Trainingsdata</h2><p>{visibleSessions.length} trainingen</p><div class="month-grid">{#each visibleSessions as item}<a class="calendar-date" href="/sessie/{item.id}{suffix}"><strong>{dateNl(item.date)}</strong><span>{item.title}</span><small>{item.time}</small></a>{/each}</div></div>
  {:else if calendarTab === 'Week'}<div class="stack">{#each visibleSessions as item}<article class="card session-row"><div class="date-tile">{dateNl(item.date)}</div><div class="grow"><h3><a href="/sessie/{item.id}{suffix}">{item.title}</a></h3><p>{item.time} · {item.focus}</p></div><span class="badge">{item.phase}</span></article>{/each}</div>
  {:else}<div class="table-wrap card"><table class="table"><thead><tr><th>Datum</th><th>Sessie</th><th>Fase</th><th>Blokken</th><th>Status</th></tr></thead><tbody>{#each visibleSessions as item}<tr><td>{dateNl(item.date)}</td><td><a href="/sessie/{item.id}{suffix}">{item.title}</a></td><td><span class="badge">{item.phase}</span></td><td>{item.blocks.map(block => block.title).join(' · ') || 'Geen blokken'}</td><td>{item.completed ? 'Voltooid' : 'Gepland'}</td></tr>{/each}</tbody></table></div>{/if}
{:else if pathname.startsWith('/sessie/')}
  {#if !session}<Status state="empty" message="Deze sessie hoort niet bij het actieve team of bestaat niet." />
  {:else}
  <a class="back" href="/kalender{suffix}"><ArrowLeft size={16}/> Terug naar kalender</a><div class="page-title"><div><span class="eyebrow">TRAININGSSESSIE · {session.phase.toUpperCase()}</span><h1>{session.title}</h1><p>{team?.name} · {team?.age_group_id} · {dateNl(session.date)} · {session.time}–{session.end} · {session.location}</p></div><span class="badge">{session.completed ? 'Voltooid' : 'Gepland'}</span></div>
  <div class="section-heading"><h2><Clock3 size={19}/> Tijdlijn</h2><span>Een overzicht voor langs het veld</span></div><div class="timeline">{#each session.blocks as block}<article class="card timeline-row"><div class="timeline-time">{block.time}</div><div class="grow"><h3>{#if block.title === 'Warming-up'}<a href="/warming-up{suffix}">{block.title}</a>{:else if block.drillId && catalog?.drills.some((d) => d.id === block.drillId)}<a href="/drills/{block.drillId}{suffix}">{block.title}</a>{:else}{block.title}{/if} <span class="muted">({block.minutes} min)</span></h3><p>{block.detail}</p></div><Clock3 size={18}/></article>{/each}</div>
  <article class="card"><h3><Dumbbell size={18}/> Materiaal</h3><p>{session.equipment.join(' · ')}</p></article>
  <div class="action-bar"><button class="btn secondary" onclick={() => copy(session)}><Copy size={16}/> Kopieer samenvatting</button><button class="btn secondary" onclick={() => downloadIcal(session)}><Download size={16}/> Exporteer iCal</button><button class="btn secondary" onclick={() => complete(session)}><CheckCircle2 size={16}/> {session.completed ? 'Heropen sessie' : 'Markeer als voltooid'}</button><button class="btn primary" onclick={() => whatsapp(session)}><Send size={16}/> Deel via WhatsApp</button></div>
  {/if}
{:else if pathname === '/drills'}
  <div class="page-title"><div><span class="eyebrow">VIND DE JUISTE OEFENING</span><h1><LayoutGrid size={25}/> Drillcatalogus</h1><p>{catalog?.drills.length} drills · {Object.keys(catalog?.categories ?? {}).length} categorieën</p></div></div>
  <div class="card filters"><div class="form-grid"><label>Zoeken<div class="search-input"><Search size={18}/><input type="search" placeholder="Zoek op naam, categorie of materiaal…" bind:value={search}/></div></label><label>Sorteer op<select bind:value={sort}><option value="naam">Naam (A–Z)</option><option value="duur">Duur (kort–lang)</option><option value="niveau">Niveau</option></select></label><label>Leeftijdscategorie<select bind:value={ageFilter}><option value="alle">Alle categorieën</option>{#each ['Beeball', 'U12', 'U15', 'U21', 'Senioren'] as age}<option value={age}>{age}</option>{/each}</select></label><label>Skill<select bind:value={skillFilter}><option value="alle">Alle skills</option>{#each skillOptions as skill}<option value={skill}>{skill}</option>{/each}</select></label></div><p class="hint">Leeftijdskoppelingen zijn nog niet beschikbaar; de leeftijdskeuze filtert de catalogus daarom nog niet. Skills worden gefilterd op catalogustags.</p><div class="filter-row"><button class="chip" class:chosen={category === 'alle'} onclick={() => category = 'alle'}>Alle ({catalog?.drills.length})</button>{#each Object.keys(catalog?.categories ?? {}) as cat}<button class="chip" class:chosen={category === cat} onclick={() => category = cat}>{cat} ({catalog?.drills.filter((d) => d.category === cat).length})</button>{/each}</div></div>
  <div class="section-heading"><h2>Oefeningen</h2><span>{visibleDrills.length} resultaten</span></div>
  {#if !visibleDrills.length}<Status state="empty" message="Geen drills gevonden. Pas je filters aan." />{:else}<div class="drill-grid">{#each visibleDrills as item}<article class="card drill-card"><div class="drill-top"><span class="drill-icon"><Target size={23}/></span><span class="badge">{item.category}</span></div><h3><a href="/drills/{item.id}{suffix}">{item.name_nl}</a></h3><p>{item.description}</p><div class="drill-meta"><Clock3 size={15}/> {item.duration_minutes.minimum}–{item.duration_minutes.maximum} min <span>·</span> {item.difficulty} <span>·</span> {item.indoor_friendly ? 'indoor' : 'buiten'}</div></article>{/each}</div>{/if}
{:else if pathname.startsWith('/drills/')}
  {#if !drill}<Status state="empty" message="Deze drill bestaat niet in de catalogus." />
  {:else}
  <a class="back" href="/drills{suffix}"><ArrowLeft size={16}/> Terug naar catalogus</a><div class="page-title"><div><span class="eyebrow">DRILLDETAIL · {drill.category.toUpperCase()}</span><h1>{drill.name_nl}</h1><p>{drill.category} · {drill.subcategories.join(', ')} · {drill.difficulty} · {drill.duration_minutes.minimum}–{drill.duration_minutes.maximum} min · {drill.players_min}–{drill.players_max} spelers · {drill.indoor_friendly ? 'indoor-geschikt' : 'buiten'}</p></div><span class="badge">{drill.category}</span></div>
  <div class="two-col"><div class="stack"><article class="card"><h2><Play size={18}/> Video</h2>{#if drill.youtube}{#if video}<iframe class="video" title={drill.youtube.title} src="https://www.youtube-nocookie.com/embed/{new URL(drill.youtube.url).searchParams.get('v')}?start={drill.youtube.start_seconds}" referrerpolicy="strict-origin-when-cross-origin" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>{:else}<button class="video-button" onclick={() => video = true}><Play size={32}/><strong>Klik om video te laden</strong><span>YouTube · externe inhoud</span></button>{/if}<p><a href={drill.youtube.url} target="_blank" rel="noopener noreferrer">Open video op YouTube</a> als afspelen hier niet lukt.</p>{:else}<p>Voor deze drill is geen video beschikbaar.</p>{/if}</article><article class="card"><h2><MapPin size={18}/> Setup</h2><ul>{#each drill.setup as line}<li>{line}</li>{/each}</ul></article><article class="card"><h2><ListChecks size={18}/> Uitvoering</h2><ol>{#each drill.execution as line}<li>{line}</li>{/each}</ol></article></div><div class="stack">{#each [{title: 'Coachingpunten', lines: drill.coaching_points}, {title: 'Veelgemaakte fouten', lines: drill.common_mistakes}, {title: 'Veiligheid', lines: drill.safety_notes}, {title: 'Variaties', lines: drill.variations.map((v) => `${v.name} (${v.difficulty}) — ${v.description}`)}] as section}<article class="card"><h2><Target size={18}/> {section.title}</h2><ul>{#each section.lines as line}<li>{line}</li>{/each}</ul></article>{/each}<article class="card"><h2><Dumbbell size={18}/> Materiaal</h2><p>Verplicht: {drill.equipment_required.join(', ')} · Optioneel: {drill.equipment_optional.join(', ')}</p></article></div></div>
  <article class="card"><h2><TrendingUp size={18}/> Skillkoppeling</h2><p>{drill.skills.join(' · ')} · Catalogustags. Categorie- en niveaukoppelingen zijn configureerbaar; bij een overgang blijft de skillhistorie behouden.</p></article>
  {/if}
{:else if pathname === '/warming-up'}
  <div class="page-title"><div><span class="eyebrow">KLAAR VOOR DE TRAINING</span><h1><Activity size={25}/> Warming-up</h1><p>{team?.name} · {catalog?.warmup.duration_minutes} minuten totaal · {checked.length} van {catalog?.warmup.blocks.reduce((n, b) => n + b.items.length, 0)} oefeningen afgevinkt</p></div></div>
  {#if !nextSession}<Status state="empty" message="Plan eerst een sessie voor dit team." />{:else}<div class="stack">{#each catalog?.warmup.blocks ?? [] as block, bi}<section class="card"><div class="section-heading"><h2><Clock3 size={18}/> {block.name}</h2><span class="badge">{block.duration_minutes} min</span></div><ul class="check-list">{#each block.items as item, ii}<li><label><input type="checkbox" checked={checked.includes(`${bi}-${ii}`)} onchange={() => toggleCheck(`${bi}-${ii}`)} /> {item}</label></li>{/each}</ul></section>{/each}</div><p class="hint">Voortgang wordt lokaal bewaard voor deze teamsessie.</p>{/if}
{:else if pathname === '/instellingen' && settings}
  <div class="page-title"><div><span class="eyebrow">JOUW TEAM, JOUW PLAN</span><h1><SettingsIcon size={25}/> Programma-instellingen</h1><p>{team?.name}</p></div></div>
  <form class="stack" onsubmit={(e) => { e.preventDefault(); void saveSettings(); }}>
    <section class="card"><h2>Teamprofiel</h2><div class="form-grid"><label>Teamnaam<input value={team?.name ?? ''} disabled /></label><label>Leeftijdscategorie<input value={team?.age_group_id ?? ''} disabled /></label></div><p class="hint">Kies een ander team bovenaan. Skillhistorie blijft behouden bij een overgang.</p></section>
    <section class="card"><h2><CalendarDays size={18}/> Planning</h2><div class="form-grid"><label>Startdatum<input type="date" bind:value={settings.startDate} required /></label><label>Trainingsdag<select bind:value={settings.day}>{#each ['maandag','dinsdag','woensdag','donderdag','vrijdag','zaterdag','zondag'] as day}<option>{day}</option>{/each}</select></label><label>Starttijd<input type="time" bind:value={settings.time} required /></label><label>Duur per training (minuten)<input type="number" min="60" max="180" step="15" bind:value={settings.duration} required /></label><label>Seizoensfase<select bind:value={settings.phase}>{#each ['Winter','Preseason','Competitie','Postseason'] as f}<option>{f}</option>{/each}</select></label></div></section>
    <section class="card"><h2><MapPin size={18}/> Ruimte & materiaal</h2><div class="form-grid"><label>Locatie<select bind:value={settings.location}><option>zaal — laag plafond</option><option>zaal — hoog plafond</option><option>buitenveld</option></select></label></div><p>Beschikbaarheid</p><div class="check-row"><label><input type="checkbox" bind:checked={settings.field}/> Veld</label><label><input type="checkbox" bind:checked={settings.cage}/> Slagkooi</label><label><input type="checkbox" bind:checked={settings.mound}/> Mound</label></div><p>Materiaal</p><div class="check-row">{#each ['bat','balls','gloves','net','tee','cones','banden','L-scherm','wiffle balls'] as equipment}<label><input type="checkbox" value={equipment} bind:group={settings.equipment}/> {equipmentLabels[equipment] ?? equipment}</label>{/each}</div></section>
    <p class="hint">Instellingen worden lokaal op dit apparaat bewaard. Voer geen persoonsgegevens van jeugdspelers in.</p><div class="action-bar"><button class="btn secondary" type="submit">Bewaar instellingen</button><button class="btn primary" type="button" onclick={generate}><CalendarDays size={16}/> Genereer seizoensplan</button></div>
  </form>
{:else if management}
  <div class="page-title"><div><span class="eyebrow">CLUB & SEIZOEN</span><h1><Shield size={25}/> Beheer · {skillsManagement ? 'Skills' : 'Users'}</h1><p>{skillsManagement ? 'Vaardigheden en doelen' : 'Teams en gebruikers'}</p></div></div>
  <nav class="tabs" aria-label="Beheeronderdelen">
    <a href="/beheer/users" aria-current={!skillsManagement ? 'page' : undefined}>Users</a>
    <a href="/beheer/skills" aria-current={skillsManagement ? 'page' : undefined}>Skills</a>
  </nav>
  {#if !skillsManagement}
    {#if admin}
    <CommitteeManager />
    <section class="card"><h2>Team voor seizoen aanmaken</h2><div class="form-grid"><label>Teamnaam<input bind:value={newTeamName} /></label><label>Seizoenjaar<input type="number" bind:value={newYear} min="2000" max="2200"/></label><label>Leeftijdsgroep<select bind:value={newAge}>{#each ['Beeball', 'U12', 'U15', 'U21', 'Senioren'] as age}<option value={age}>{age}</option>{/each}</select></label></div><div class="action-bar"><button class="btn primary" onclick={createSeason}>Maak team voor seizoen</button></div></section>
    {#if team}{#key team.id}<TrainerManager teamId={team.id} teamName={team.name} {assignments} />{/key}{/if}
    {:else}<p>Gebruikers- en teambeheer is beschikbaar voor de TC.</p>{/if}
  {:else}
    {#if admin}
      <CurriculumEditor />
      <DevelopmentEditor />
    {/if}
    {#if team}<section class="card"><h2><Target size={18}/> Doelen samenstellen · {team.name}</h2>
    <label>Seizoen<select bind:value={currentSeason} onchange={() => load()}>{#if !seasons.length}<option value="">Geen seizoenen beschikbaar</option>{/if}{#each seasons as season}<option value={season.id}>{season.year} · {season.age_group_id}</option>{/each}</select></label>
    <p>Generieke doelen · {team.age_group_id} · {goalVersion ? `versie ${goalVersion}` : 'niet beschikbaar'}</p>
    {#if genericGoals.length}<div class="check-list">{#each genericGoals as goal}<label><input type="checkbox" value={goal.id} bind:group={selectedGeneric}/> {goal.text}</label>{/each}</div>
    <h3>Teamspecifieke doelen</h3><ul>{#each draftGoals as goal}<li>{goal.text} <button class="link-button" onclick={() => draftGoals = draftGoals.filter(item => item.id !== goal.id)}>Verwijderen</button></li>{/each}</ul>
    <div class="inline-form"><label>Nieuw teamdoel<input bind:value={newGoal} placeholder="Beschrijf een teamdoel" /></label><button class="btn secondary" onclick={addGoal}>Voeg teamdoel toe</button></div><p>Samengesteld: {selectedGeneric.length + draftGoals.length} doelen.</p><div class="action-bar"><button class="btn primary" disabled={!currentSeason} onclick={saveGoals}>Bewaar doelen voor seizoen</button></div>
    {:else}<p>Er zijn nog geen generieke doelen beschikbaar voor deze leeftijdsgroep.</p>{/if}
  </section>
  {#if currentSeason}
    {#key `${team.id}:${currentSeason}`}
      <DevelopmentTeamGoals teamId={team.id} seasonId={currentSeason} ageGroup={seasons.find(item => item.id === currentSeason)?.age_group_id ?? team.age_group_id} />
    {/key}
  {/if}
    {:else}<p>Maak eerst een team aan.</p>{/if}
  {/if}
{/if}
{#if message}<aside class="alert" role="status">{message}<button class="link-button" onclick={() => message = ''}>Sluiten</button></aside>{/if}
