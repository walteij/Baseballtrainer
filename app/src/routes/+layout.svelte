<script lang="ts">
  import '../app.css';
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { api } from '$lib/api';
  import { initializeAuth, signIn, signOut, identity } from '$lib/auth';
  import { activeTeam } from '$lib/stores/team';
  import type { Team } from '$lib/api/types';
  import { Home, CalendarDays, LayoutGrid, Activity, Settings, Shield, Search, Moon, Sun } from 'lucide-svelte';
  import { AppBar } from '@skeletonlabs/skeleton-svelte';

  let teams: Team[] = [];
  let dark = false;
  let admin = false;
  let theme: 'light' | 'dark' | 'system' = 'system';
  let teamError = '';
  let authState: 'loading' | 'signedOut' | 'ready' | 'error' = 'loading';
  let authError = '';
  $: admin = $identity?.isCommittee ?? false;
  $: suffix = '';
  const nav = [
    { path: '/', label: 'Home', icon: Home },
    { path: '/kalender', label: 'Kalender', icon: CalendarDays },
    { path: '/drills', label: 'Drills', icon: LayoutGrid },
    { path: '/warming-up', label: 'Warming-up', icon: Activity },
    { path: '/instellingen', label: 'Instellingen', icon: Settings },
    { path: '/beheer', label: 'Beheer', icon: Shield }
  ];
  async function loadTeams() {
    try { teamError = ''; teams = await api.listTeams(); }
    catch { teamError = 'Teams konden niet worden geladen.'; }
  }
  function applyTheme() {
    dark = theme === 'dark' || (theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', dark);
  }
  function toggleTheme() {
    theme = dark ? 'light' : 'dark'; localStorage.setItem('app-theme', theme); applyTheme();
  }
  async function startAuth() {
    try {
      authError = '';
      if (!await initializeAuth()) { authState = 'signedOut'; return; }
      identity.set(await api.getIdentity());
      const available = await api.listTeams();
      teams = available;
      const saved = localStorage.getItem('active-team');
      activeTeam.set(available.some(team => team.id === saved) ? saved! : available[0]?.id ?? '');
      authState = 'ready';
    } catch (error) {
      authError = error instanceof Error ? error.message : 'Aanmelden is mislukt.';
      authState = 'error';
    }
  }
  onMount(() => {
    const saved = localStorage.getItem('active-team');
    if (saved) activeTeam.set(saved);
    const unsubscribe = activeTeam.subscribe((value) => localStorage.setItem('active-team', value));
    const savedTheme = localStorage.getItem('app-theme');
    if (savedTheme === 'light' || savedTheme === 'dark') theme = savedTheme;
    const media = matchMedia('(prefers-color-scheme: dark)'); media.addEventListener('change', applyTheme); applyTheme();
    window.addEventListener('teams-changed', loadTeams);
    void startAuth();
    return () => { unsubscribe(); media.removeEventListener('change', applyTheme); window.removeEventListener('teams-changed', loadTeams); };
  });
</script>

<svelte:head><title>Honkbal Trainer</title><meta name="description" content="Trainingen, drills en planning voor honkbaltrainers." /></svelte:head>
{#if authState === 'loading'}<main class="main"><p>Microsoft-aanmelding controleren…</p></main>
{:else if authState === 'signedOut'}<main class="main"><section class="card"><h1>Honkbal Trainer</h1><p>Meld je aan met je Microsoft-account.</p><button class="btn primary" onclick={() => { void signIn().catch(error => { authError = error instanceof Error ? error.message : 'Aanmelden is mislukt.'; authState = 'error'; }); }}>Aanmelden</button></section></main>
{:else if authState === 'error'}<main class="main"><section class="card"><h1>Aanmelden mislukt</h1><p role="alert">{authError}</p><button class="btn secondary" onclick={() => { authState = 'loading'; void startAuth(); }}>Opnieuw proberen</button><button class="btn secondary" onclick={() => { void signOut().catch(error => { authError = error instanceof Error ? error.message : 'Afmelden is mislukt.'; }); }}>Afmelden</button></section></main>
{:else}
<AppBar class="appbar">
  <a class="brand" href="/{suffix}"><img class="brand-mark" src="/icons/icon-192.png" alt="" width="40" height="40" /><span>Honkbal Trainer<small>TRAIN MET EEN PLAN</small></span></a>
  <div class="header-actions">
    <a class="icon-button" href="/drills{suffix}" aria-label="Zoek drills"><Search size={20}/></a>
    <button class="icon-button" onclick={toggleTheme} aria-label={dark ? 'Schakel lichte weergave in' : 'Schakel donkere weergave in'}>{#if dark}<Sun size={20}/>{:else}<Moon size={20}/>{/if}</button>
    <button class="btn secondary" onclick={() => { void signOut().catch(error => { authError = error instanceof Error ? error.message : 'Afmelden is mislukt.'; authState = 'error'; }); }}>Afmelden</button>
  </div>
</AppBar>
<nav class="navigation" aria-label="Hoofdnavigatie">
  <div class="nav-inner">
    {#each nav as item}
      <a class:active={item.path === '/' ? $page.url.pathname === '/' : $page.url.pathname.startsWith(item.path)} href="{item.path}{suffix}"><svelte:component this={item.icon} size={16}/>{item.label}</a>
    {/each}
  </div>
</nav>
<main class="main">
  <div class="team-bar card">
    <div><span class="eyebrow muted">ACTIEVE TEAMCONTEXT</span><strong>Trainingsprogramma</strong></div>
    <label class="team-select"><span class="sr-only">Actief team</span><select bind:value={$activeTeam} disabled={!teams.length}>{#if !teams.length}<option value={$activeTeam}>Geen team beschikbaar</option>{/if}{#each teams as team}<option value={team.id}>{team.name} · {team.age_group_id}</option>{/each}</select></label>
  </div>
  {#if teamError}<aside class="alert error" role="alert">{teamError} <button class="link-button" onclick={loadTeams}>Opnieuw proberen</button></aside>{/if}
  <slot />
</main>
<footer><span>© Honkbal Trainer</span><span>Geen persoonsgegevens van jeugdspelers</span></footer>
{/if}
