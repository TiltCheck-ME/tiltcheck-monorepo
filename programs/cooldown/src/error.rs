// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-12
use anchor_lang::prelude::*;

#[error_code]
pub enum CooldownError {
    #[msg("A lock end time cannot be shortened")]
    LockCannotBeShortened,
    #[msg("Scope must be 0 (all), 1 (category), or 2 (game)")]
    InvalidScope,
    #[msg("end_time must be in the future")]
    EndTimeInPast,
}
