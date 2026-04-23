/**
 * generateCarePlanFilename
 *
 * Produces the standardized filename used for BOTH the Supabase Storage path
 * and the email attachment name. Keeping them identical means the filename in
 * the email, the filename in the archive, and the database record are always
 * in sync — no translation needed anywhere.
 *
 * Format:
 *   bethel-care-plan_{last}_{first}_{YYYY-MM-DD}_{id-short}.pdf
 *
 * Example:
 *   bethel-care-plan_cutney_joan_2026-04-18_a3f2b1.pdf
 *
 * Rules:
 *   - All segments are lowercase
 *   - Accented characters are normalized to their ASCII base (é → e)
 *   - Only a–z, 0–9, and hyphens survive sanitization
 *   - Spaces within a name segment become hyphens (e.g. "Mary Jane" → "mary-jane")
 *   - The ID short is the first 6 characters of the raw submission UUID
 *     (UUIDs start with alphanumeric chars so no dash-stripping is needed)
 *   - If a name part cannot be parsed, "unknown" is used as a safe fallback
 */

function sanitizeSegment(raw: string): string {
  return (
    raw
      .toLowerCase()
      // Normalize accented chars: é → e, ñ → n, etc.
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      // Remove anything that isn't a-z, 0-9, space, or hyphen
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      // Collapse runs of whitespace/hyphens into a single hyphen
      .replace(/[\s-]+/g, "-")
  );
}

/**
 * @param clientFullName  The full name field from the care plan form
 *                        (e.g. "Joan Cutney", "Mary Jane Watson")
 * @param submissionId    The UUID of the static_form_submissions row
 * @param submittedAt     The submission timestamp (Date object or ISO string)
 */
export function generateCarePlanFilename(
  clientFullName: string,
  submissionId: string,
  submittedAt: Date | string
): string {
  // Split on whitespace — last token is the last name
  const parts = clientFullName.trim().split(/\s+/);
  const rawLast  = parts.length > 1 ? parts[parts.length - 1] : parts[0];
  const rawFirst = parts.length > 1 ? parts.slice(0, -1).join(" ") : "";

  const last  = sanitizeSegment(rawLast)  || "unknown";
  const first = sanitizeSegment(rawFirst) || "unknown";

  // YYYY-MM-DD from the submission timestamp
  const date = typeof submittedAt === "string" ? new Date(submittedAt) : submittedAt;
  const dateStr = date.toISOString().slice(0, 10);

  // First 6 chars of the UUID (always alphanumeric — no dashes at positions 0-5)
  const idShort = submissionId.slice(0, 6);

  return `bethel-care-plan_${last}_${first}_${dateStr}_${idShort}.pdf`;
}

/**
 * Produces the storage object path inside the care-plans bucket.
 *
 * Format: {submitted_by_user_id}/{filename}
 *
 * Namespacing by user ID keeps files organized per submitter and
 * makes it easy to query all files for a given staff member.
 */
export function generateCarePlanStoragePath(
  submittedByUserId: string,
  filename: string
): string {
  return `${submittedByUserId}/${filename}`;
}
