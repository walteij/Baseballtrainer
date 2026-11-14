<script lang="ts">
  import {
    ensureCommitteeRole, findTrainerByEmail, inviteTrainer, trainerAdministrationToken,
    type DirectoryUser,
  } from '$lib/services/trainerDirectory';

  let email = '';
  let searchedEmail = '';
  let candidate: DirectoryUser | null = null;
  let searched = false;
  let busy = false;
  let message = '';

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

  async function addCommitteeMember() {
    busy = true;
    message = '';
    let stage: 'zoeken' | 'uitnodigen' | 'rol' = 'zoeken';
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
      await ensureCommitteeRole(token, user.id);
      message = candidate
        ? 'De TC-rol is toegekend. Bestaande Trainer-rollen en teamkoppelingen blijven behouden.'
        : 'Entra heeft de uitnodiging geaccepteerd en de TC-rol is toegekend. Controleer of de uitnodiging is ontvangen.';
      email = '';
      candidate = null;
      searched = false;
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'Onbekende fout.';
      if (stage === 'uitnodigen') message = `Uitnodigen is niet bevestigd. Controleer in Entra of er al een uitnodiging bestaat voordat je opnieuw probeert. ${detail}`;
      else if (stage === 'rol') message = `De gebruiker kan al zijn uitgenodigd, maar de TC-rol is niet bevestigd. Zoek opnieuw om verder te gaan. ${detail}`;
      else message = detail;
      searched = false;
    } finally {
      busy = false;
    }
  }
</script>

<section class="card">
  <h2>TC-leden beheren</h2>
  <p>Een TC-lid kan doelen en trainingen voor alle teams wijzigen, clubdoelen beheren en teams en trainerkoppelingen beheren. Een Trainer-rol en bestaande teamkoppelingen blijven behouden.</p>
  <p>Een Entra-beheerder kan op e-mailadres een bestaand lid opzoeken of een nieuwe gast uitnodigen. Het toekennen van TC maakt iemand geen Entra-beheerder.</p>
  <form class="inline-form" onsubmit={(event) => { event.preventDefault(); void search(); }}>
    <label>E-mailadres TC-lid<input type="email" required maxlength="254" bind:value={email} oninput={() => { searched = false; }} /></label>
    <button class="btn secondary" type="submit" disabled={busy}>Zoek TC-lid</button>
  </form>
  {#if searched}
    {#if candidate}
      <p>Bestaande gebruiker gevonden: <strong>{label(candidate)}</strong>.</p>
      <button class="btn primary" onclick={addCommitteeMember} disabled={busy}>Ken TC-rol toe</button>
    {:else}
      <p>Geen gebruiker gevonden voor <strong>{searchedEmail}</strong>. Controleer het adres voordat je de uitnodiging verstuurt.</p>
      <button class="btn primary" onclick={addCommitteeMember} disabled={busy}>Nodig gast uit en ken TC-rol toe</button>
    {/if}
  {/if}
  {#if message}<p class="alert" role="status">{message}</p>{/if}
</section>
