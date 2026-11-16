<script lang="ts">
  import { onMount } from 'svelte';
  import { developmentBandsForCategory } from '../../../../shared/types/developmentAgeGroups.js';
  import { api } from '$lib/api';
  import type { AgeGroup, DevelopmentAssignment, DevelopmentModel, DevelopmentVersion, TransitionCheck } from '$lib/api/types';

  export let teamId: string;
  export let seasonId: string;
  export let ageGroup: AgeGroup;

  const levelLabels: Record<string, string> = {
    awareness: 'kennismaken', introduction: 'introduceren', foundation: 'basis leggen',
    developing: 'ontwikkelen', proficient: 'beheersen', advanced: 'verdiepen',
  };
  let version = 0;
  let model: DevelopmentVersion | null = null;
  let latest: DevelopmentVersion | null = null;
  let assignments: DevelopmentAssignment[] = [];
  let transitionCheck: TransitionCheck | null = null;
  let loaded = false;
  let busy = false;
  let notice = '';
  $: bands = model ? developmentBandsForCategory(ageGroup, model.model.ageGroups) : [];
  $: uncovered = transitionCheck?.skills.filter(skill => !skill.covered) ?? [];

  async function load() {
    busy = true; notice = '';
    try {
      const [current, newest, check] = await Promise.all([
        api.getDevelopmentAssignments(teamId, seasonId), api.getDevelopment(),
        api.getTransitionCheck(teamId, seasonId),
      ]);
      const pinned = current ? await api.getDevelopment(current.modelVersion) : newest;
      if (current && !pinned) throw new Error('De opgeslagen versie van de ontwikkelleerlijn ontbreekt.');
      version = current?.version ?? 0;
      assignments = current?.assignments ?? [];
      model = pinned;
      latest = newest;
      transitionCheck = check;
      loaded = true;
    } catch (error) { notice = error instanceof Error ? error.message : 'Doelen laden mislukt.'; }
    finally { busy = false; }
  }
  function find(choices: DevelopmentAssignment[], goalType: DevelopmentAssignment['goalType'], goalId: string) {
    return choices.find(item => item.goalType === goalType && item.goalId === goalId);
  }
  function setActive(goalType: DevelopmentAssignment['goalType'], goalId: string, ageGroupId: string, active: boolean) {
    const existing = find(assignments, goalType, goalId);
    if (existing) existing.active = active;
    else assignments = [...assignments, { id: crypto.randomUUID(), teamId, seasonId, ageGroupId, goalType, goalId, active, priority: 3 }];
    assignments = [...assignments];
  }
  function setOverride(item: DevelopmentAssignment, field: 'name' | 'description', value: string) {
    item.overrides = { ...item.overrides, [field]: value };
    assignments = [...assignments];
  }
  function setPercentage(item: DevelopmentAssignment, value: string) {
    const overrides = { ...item.overrides };
    if (value === '') delete overrides.masteryTargetPercentage;
    else overrides.masteryTargetPercentage = Number(value);
    item.overrides = overrides;
    assignments = [...assignments];
  }
  function canUpgrade(next: DevelopmentModel) {
    const ages = new Set(developmentBandsForCategory(ageGroup, next.ageGroups).map(age => age.id));
    return assignments.every(item => {
      const goal = item.goalType === 'skill_goal'
        ? next.skillGoals.find(value => value.id === item.goalId)
        : next.clubGoals.find(value => value.id === item.goalId);
      return goal && goal.ageGroupId === item.ageGroupId && ages.has(item.ageGroupId) && (!item.active || goal.status !== 'archived');
    });
  }
  function upgrade() {
    if (!latest || !canUpgrade(latest.model)) {
      notice = 'Niet alle bestaande keuzes zijn beschikbaar in de nieuwe versie. Verwijder eerst de betreffende keuzes of behoud de huidige versie.';
      return;
    }
    model = latest;
    notice = 'Nieuwe versie gekozen. Deze wordt pas gebruikt na opslaan.';
  }
  function remove(item: DevelopmentAssignment) {
    assignments = assignments.filter(value => value.id !== item.id);
  }
  async function save() {
    if (!model) return;
    busy = true; notice = '';
    try {
      const saved = await api.saveDevelopmentAssignments(teamId, seasonId, { expectedVersion: version, modelVersion: model.version, assignments });
      version = saved.version;
      assignments = saved.assignments;
      transitionCheck = await api.getTransitionCheck(teamId, seasonId);
      notice = 'Ontwikkeldoelen voor dit teamseizoen opgeslagen.';
    } catch (error) { notice = error instanceof Error ? error.message : 'Opslaan mislukt.'; }
    finally { busy = false; }
  }
  onMount(() => { void load(); });
</script>

<section class="card">
  <h2>Ontwikkeldoelen voor dit teamseizoen</h2>
  <p>Conceptdoelen zijn voorstellen. Kies wat bij dit team past; afwijkingen veranderen de centrale leerlijn niet. Actieve doelen sturen de trainingsgenerator: oefeningen in de bijbehorende categorieën krijgen voorrang op basis van de ingestelde prioriteit.</p>
  <p>Leeftijdsbanden worden op overlap getoond, ook bij grensleeftijden. Controleer of de beschikbare banden alle spelers van je team voldoende dekken.</p>
  {#if busy}<p>Bezig...</p>{/if}
  {#if loaded && transitionCheck?.transition}
    <section aria-label="Leeftijdsovergang">
      <h3>Leeftijdsovergang {transitionCheck.transition.from} → {transitionCheck.transition.to}</h3>
      {#if transitionCheck.modelVersion === null}
        <p>Er is nog geen ontwikkelleerlijn beschikbaar om de overgang te controleren.</p>
      {:else if transitionCheck.skills.length === 0}
        <p>De leerlijn bevat geen vaardigheden die in beide leeftijdscategorieën voorkomen.</p>
      {:else}
        <p>
          Deze basisvaardigheden uit {transitionCheck.transition.from} horen in {transitionCheck.transition.to} opnieuw aangeboden en verder ontwikkeld te worden
          (leerlijnversie {transitionCheck.modelVersion}).
          {#if uncovered.length}Nog niet gedekt door actieve seizoensdoelen: {uncovered.length} van {transitionCheck.skills.length}.{:else}Alle vaardigheden zijn gedekt door actieve seizoensdoelen.{/if}
        </p>
        <table>
          <thead><tr><th>Vaardigheid</th><th>Was</th><th>Wordt</th><th>Volgende stap</th><th>Gedekt</th></tr></thead>
          <tbody>
            {#each transitionCheck.skills as skill (skill.id)}
              <tr>
                <td>{skill.name} <small>({skill.category})</small></td>
                <td>{levelLabels[skill.previousLevel] ?? skill.previousLevel}</td>
                <td>{levelLabels[skill.nextLevel] ?? skill.nextLevel}</td>
                <td>{skill.nextGoal}</td>
                <td>{skill.covered ? '✓ gedekt' : '⚠ niet gedekt'}</td>
              </tr>
            {/each}
          </tbody>
        </table>
        <p>De dekking wordt opnieuw berekend nadat je ontwikkeldoelen hebt opgeslagen.</p>
      {/if}
    </section>
  {/if}
  {#if loaded}
    {#if !model}
      <p>Er is nog geen ontwikkelleerlijn beschikbaar. Een TC-lid kan deze laden bij beheer.</p>
    {:else}
      <p>Leerlijnversie {model.version} · teamkeuzeversie {version || 'nog niet opgeslagen'}.</p>
      {#if ageGroup === 'Beeball' && bands.length && bands.every(band => band.minAge > 0)}
        <p>Er is geen leeftijdsband voor spelers jonger dan {Math.min(...bands.map(band => band.minAge))} jaar.</p>
      {/if}
      {#if (ageGroup === 'U21' || ageGroup === 'Senioren') && bands.some(band => band.maxAge === null && band.minAge <= 21)}
        <p>De open leeftijdsband wordt gedeeld met U21 en senioren; er is daarin nog geen verdere leeftijdsindeling.</p>
      {/if}
      {#if latest && latest.version !== model.version}
        <button class="btn secondary" disabled={busy} onclick={upgrade}>Kies nieuwere leerlijnversie {latest.version}</button>
      {/if}
      {#each bands as band (band.id)}
        <h3>{band.name}</h3>
        {#each [...model.model.skillGoals.filter(goal => goal.ageGroupId === band.id).map(goal => ({ goal, type: 'skill_goal' as const })), ...model.model.clubGoals.filter(goal => goal.ageGroupId === band.id).map(goal => ({ goal, type: 'club_goal' as const }))] as entry (entry.goal.id)}
          {@const selected = find(assignments, entry.type, entry.goal.id)}
          {#if entry.goal.status !== 'archived' || selected}
            <details>
              <summary>{entry.goal.name.nl} · {entry.type === 'skill_goal' ? 'vaardigheid' : 'clubdoel'} · {entry.goal.status}</summary>
              <p>{entry.goal.description.nl}</p>
              <label><input type="checkbox" checked={selected?.active ?? false} disabled={busy || (entry.goal.status === 'archived' && !selected?.active)} onchange={(event) => setActive(entry.type, entry.goal.id, band.id, event.currentTarget.checked)} /> Actief voor dit team</label>
              {#if 'masteryCriteria' in entry.goal}
                <ul>{#each entry.goal.masteryCriteria as criterion}<li>{criterion.description.nl}</li>{/each}</ul>
              {/if}
              {#if selected}
                <div class="form-grid">
                  <label>Prioriteit (1–5)<input type="number" min="1" max="5" bind:value={selected.priority} disabled={busy} /></label>
                  <label>Traineropmerking<textarea bind:value={selected.coachNote} disabled={busy}></textarea></label>
                  <label>Eigen naam<input value={selected.overrides?.name ?? ''} disabled={busy} oninput={(event) => setOverride(selected, 'name', event.currentTarget.value)} /></label>
                  <label>Eigen omschrijving<textarea value={selected.overrides?.description ?? ''} disabled={busy} oninput={(event) => setOverride(selected, 'description', event.currentTarget.value)}></textarea></label>
                  <label>Eigen streefpercentage<input type="number" min="0" max="100" value={selected.overrides?.masteryTargetPercentage ?? ''} disabled={busy} oninput={(event) => setPercentage(selected, event.currentTarget.value)} /></label>
                </div>
                <button class="btn secondary" disabled={busy} onclick={() => remove(selected)}>Verwijder teamkeuze</button>
              {/if}
            </details>
          {/if}
        {/each}
      {/each}
      <div class="action-bar"><button class="btn primary" disabled={busy} onclick={save}>Bewaar ontwikkeldoelen</button></div>
    {/if}
  {:else if !busy}<button class="btn secondary" onclick={load}>Opnieuw laden</button>{/if}
  {#if notice}<p role="status">{notice}</p>{/if}
</section>
