<script lang="ts">
  import { api } from '$lib/api';
  import {
    ensureTrainerRole, findTrainerByEmail, getTrainer, inviteTrainer, trainerAdministrationToken,
    type DirectoryUser,
  } from '$lib/services/trainerDirectory';

  export let teamId: string;
  export let teamName: string;
  export let assignments: { objectId: string }[];

  let email = '';
  let searchedEmail = '';
  let candidate: DirectoryUser | null = null;
  let searched = false;
  let busy = false;
  let message = '';
  let labels: Record<string, string> = {};

  function label(user: DirectoryUser): string {
    const address = user.mail ?? user.otherMails?.[0] ?? user.userPrincipalName;
    return [user.displayName, address].filter(Boolean).join(' · ') || user.id;
  }

  async function search() {
    busy = true;
    message = '';
    searched = false;
    candidate = null;
    try {
      const input = email.trim();
      const token = await trainerAdministrationToken();
      candidate = await findTrainerByEmail(token, input);
      searchedEmail = input;
      searched = true;
    } catch (error) {
      message = error instanceof Error ? error.message : 'Zoeken in Entra is mislukt.';
    } finally {
      busy = false;
    }
  }

  async function addTrainer() {
    busy = true;
    message = '';
    let stage = 'zoeken';
    try {
      const token = await trainerAdministrationToken();
      let user = await findTrainerByEmail(token, searchedEmail);
      if (candidate && (!user || candidate.id.toLowerCase() !== user.id.toLowerCase())) {
        throw new Error('De gevonden gebruiker is gewijzigd. Zoek opnieuw voordat je verdergaat.');
      }
      if (!candidate && user) throw new Error('Er is inmiddels een bestaande gebruiker gevonden. Zoek opnieuw voordat je verdergaat.');
      if (!user) {
        stage = 'uitnodigen';
        user = await inviteTrainer(token, searchedEmail);
      }
      stage = 'rol';
      await ensureTrainerRole(token, user.id);
      stage = 'team';
      await api.assignTrainer(teamId, user.id);
      assignments = await api.listAssignments(teamId);
      labels = { ...labels, [user.id.toLowerCase()]: label(user) };
      message = candidate
        ? 'De bestaande gebruiker heeft de Trainer-rol en is aan dit team gekoppeld.'
        : 'Entra heeft de uitnodiging geaccepteerd, de Trainer-rol is toegekend en de gebruiker is aan dit team gekoppeld. Controleer of de uitnodiging is ontvangen.';
      email = '';
      candidate = null;
      searched = false;
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'Onbekende fout.';
      if (stage === 'uitnodigen') message = `Uitnodigen is niet bevestigd. Controleer in Entra of er al een uitnodiging bestaat voordat je opnieuw probeert. ${detail}`;
      else if (stage === 'rol') message = `De gebruiker kan al zijn uitgenodigd, maar de roltoekenning is niet bevestigd. Zoek opnieuw om verder te gaan. ${detail}`;
      else if (stage === 'team') message = `De Trainer-rol is toegekend, maar de teamkoppeling kon niet worden bevestigd. Zoek opnieuw om verder te gaan. ${detail}`;
      else message = detail;
      searched = false;
    } finally {
      busy = false;
    }
  }

  async function showNames() {
    busy = true;
    message = '';
    try {
      const token = await trainerAdministrationToken();
      const users = await Promise.all(assignments.map(item => getTrainer(token, item.objectId)));
      labels = Object.fromEntries(users.map(user => [user.id.toLowerCase(), label(user)]));
    } catch (error) {
      message = error instanceof Error ? error.message : 'Trainernamen ophalen is mislukt.';
    } finally {
      busy = false;
    }
  }

  async function removeTrainer(objectId: string) {
    busy = true;
    message = '';
    let removed = false;
    try {
      await api.unassignTrainer(teamId, objectId);
      removed = true;
      assignments = await api.listAssignments(teamId);
      message = 'Trainerkoppeling verwijderd. De Entra-gebruiker en Trainer-rol blijven bestaan.';
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'Onbekende fout.';
      message = removed
        ? `De trainerkoppeling is verwijderd, maar de lijst kon niet worden ververst. Laad de pagina opnieuw. ${detail}`
        : `Verwijderen kon niet worden bevestigd. Laad de pagina opnieuw om de koppeling te controleren. ${detail}`;
    } finally {
      busy = false;
    }
  }
</script>

<section class="card">
  <h2>Trainers koppelen · {teamName}</h2>
  <p>Zoek een trainer op e-mailadres. Een Entra-beheerder kan een nieuwe gast uitnodigen en aan dit team koppelen.</p>
  <form class="inline-form" onsubmit={(event) => { event.preventDefault(); void search(); }}>
    <label>E-mailadres trainer<input type="email" required maxlength="254" bind:value={email} oninput={() => { searched = false; }} /></label>
    <button class="btn secondary" type="submit" disabled={busy}>Zoek trainer</button>
  </form>
  {#if searched}
    {#if candidate}
      <p>Bestaande gebruiker gevonden: <strong>{label(candidate)}</strong>.</p>
      <button class="btn primary" onclick={addTrainer} disabled={busy}>Koppel bestaande gebruiker</button>
    {:else}
      <p>Geen gebruiker gevonden voor <strong>{searchedEmail}</strong>. Controleer het adres voordat je de uitnodiging verstuurt.</p>
      <button class="btn primary" onclick={addTrainer} disabled={busy}>Nodig gast uit en koppel</button>
    {/if}
  {/if}
  {#if assignments.length}
    <button class="link-button" onclick={showNames} disabled={busy}>Toon namen en e-mailadressen</button>
    <ul>{#each assignments as assignment}
      <li>{labels[assignment.objectId.toLowerCase()] ?? assignment.objectId} <button class="link-button" onclick={() => removeTrainer(assignment.objectId)} disabled={busy}>Verwijderen</button></li>
    {/each}</ul>
  {:else}
    <p>Geen trainers gekoppeld.</p>
  {/if}
  {#if message}<p class="alert" role="status">{message}</p>{/if}
</section>
