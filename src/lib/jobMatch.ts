// Client-side job-to-profile match scoring.
// Runs in the browser — no API call per card.
// Returns 0–100 with three weighted components:
//   Skills (50 pts): how many profile skills appear in job text
//   Role title (35 pts): word overlap between job title and target/current roles
//   Experience level (15 pts): seniority keywords vs years of experience

export interface ScoredProfile {
  skills:           string[]
  target_roles:     string[]
  current_title:    string | null
  experience_years: number | null
}

export function computeMatch(
  job:     { job_title: string; job_description: string },
  profile: ScoredProfile,
): number {
  const jobText   = `${job.job_title} ${job.job_description.slice(0, 2000)}`.toLowerCase()
  const titleLow  = job.job_title.toLowerCase()

  let score = 0

  // ── 1. Skills match (50 pts) ──────────────────────────────────────────
  const skills = profile.skills ?? []
  if (skills.length > 0) {
    const cap     = Math.min(skills.length, 15)
    const matched = skills.filter(s => jobText.includes(s.toLowerCase())).length
    score += Math.round((Math.min(matched, cap) / cap) * 50)
  } else {
    score += 25  // no skills saved → neutral
  }

  // ── 2. Role / title match (35 pts) ───────────────────────────────────
  const roles = [
    ...(profile.target_roles ?? []),
    ...(profile.current_title ? [profile.current_title] : []),
  ]
  if (roles.length > 0) {
    let best = 0
    for (const role of roles) {
      const roleWords  = role.toLowerCase().split(/\s+/).filter(w => w.length > 2)
      const titleWords = titleLow.split(/[\s,/-]+/)
      const matched    = roleWords.filter(rw => titleWords.some(tw => tw.includes(rw) || rw.includes(tw))).length
      const pct        = roleWords.length > 0 ? matched / roleWords.length : 0
      if (pct > best) best = pct
    }
    score += Math.round(best * 35)
  } else {
    score += 17  // no target roles saved → neutral
  }

  // ── 3. Experience level match (15 pts) ───────────────────────────────
  const exp = profile.experience_years
  if (exp != null) {
    const senior = /\b(senior|lead|principal|staff|head|director|vp|chief|manager)\b/i.test(titleLow)
    const junior = /\b(junior|entry|graduate|intern|trainee|fresher|associate)\b/i.test(titleLow)
    if      (senior && exp >= 4)  score += 15
    else if (senior && exp < 4)   score += 5
    else if (junior && exp <= 2)  score += 15
    else if (junior && exp > 5)   score += 5
    else                          score += 10
  } else {
    score += 8  // no exp on file → neutral
  }

  return Math.min(100, score)
}

export function matchBadgeStyle(score: number): { color: string; bg: string; border: string } {
  if (score >= 70) return { color: '#1D9E75', bg: 'rgba(29,158,117,0.12)', border: 'rgba(29,158,117,0.28)' }
  if (score >= 45) return { color: '#d97706', bg: 'rgba(217,119,6,0.10)',  border: 'rgba(217,119,6,0.25)'  }
  return              { color: '#9aafbc',  bg: 'rgba(154,175,188,0.10)', border: 'rgba(154,175,188,0.22)' }
}
