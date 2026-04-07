-- ============================================================
-- VALORA SEED DATA — Sponsorship Media Valuation Training Data
-- ============================================================
-- Realistic benchmarks for college athletics & minor league sports.
-- Safe to re-run: uses ON CONFLICT DO NOTHING via unique IDs.

-- ---------- valuation_training_data ----------
-- Formula context:
--   EMV ≈ (broadcast_minutes × 60 / 30) × (audience_size / 100) × CPP-implied-rate × screen_share × clarity
--   Numbers below reflect real-world ranges for D-I college and minor league properties.

INSERT INTO valuation_training_data
  (id, asset_category, market, audience_size, broadcast_minutes, screen_share_percent, clarity_score, actual_emv, external_benchmark, source)
VALUES
  -- LED boards: high visibility, moderate duration
  ('a0000000-0001-4000-8000-000000000001', 'LED Board', 'College D-I Basketball', 85000, 4.5, 22.0, 0.92, 14200.00, 13500.00, 'Joyce Julius 2025 benchmark'),
  ('a0000000-0001-4000-8000-000000000002', 'LED Board', 'College D-I Football', 320000, 8.0, 18.0, 0.85, 48500.00, 46000.00, 'Navigate Research 2025'),
  ('a0000000-0001-4000-8000-000000000003', 'LED Board', 'Minor League Baseball', 12000, 6.0, 25.0, 0.78, 3200.00, 3000.00, 'Industry avg MiLB 2025'),

  -- Jersey Patch: high clarity, always on screen with player
  ('a0000000-0001-4000-8000-000000000004', 'Jersey Patch', 'College D-I Basketball', 150000, 12.0, 8.0, 0.95, 38000.00, 36000.00, 'Joyce Julius 2025 benchmark'),
  ('a0000000-0001-4000-8000-000000000005', 'Jersey Patch', 'College D-I Football', 480000, 15.0, 6.0, 0.88, 72000.00, 68000.00, 'Navigate Research 2025'),

  -- Scoreboard: persistent but lower screen share
  ('a0000000-0001-4000-8000-000000000006', 'Signage', 'College D-I Basketball', 95000, 3.0, 35.0, 0.90, 16800.00, 15500.00, 'KORE Software 2025 college avg'),
  ('a0000000-0001-4000-8000-000000000007', 'Signage', 'Minor League Baseball', 8500, 5.0, 30.0, 0.82, 2100.00, 2000.00, 'Industry avg MiLB 2025'),

  -- PA Read: audio-only asset, no screen share
  ('a0000000-0001-4000-8000-000000000008', 'Radio Read', 'College D-I Football', 250000, 0.5, 0.0, 1.0, 4500.00, 4200.00, 'Learfield IMG benchmark 2025'),
  ('a0000000-0001-4000-8000-000000000009', 'Radio Read', 'Minor League Baseball', 5000, 0.5, 0.0, 1.0, 350.00, 300.00, 'MiLB Properties avg 2025'),

  -- Social Media Post: digital asset
  ('a0000000-0001-4000-8000-000000000010', 'Social Post', 'College D-I Basketball', 120000, 0.0, 0.0, 1.0, 5200.00, 4800.00, 'Opendorse college avg 2025'),
  ('a0000000-0001-4000-8000-000000000011', 'Social Post', 'College D-I Football', 500000, 0.0, 0.0, 1.0, 18500.00, 17000.00, 'Opendorse college avg 2025'),

  -- Digital / Video Board
  ('a0000000-0001-4000-8000-000000000012', 'Digital', 'College D-I Basketball', 90000, 2.0, 40.0, 0.95, 12500.00, 11800.00, 'KORE Software 2025 college avg'),
  ('a0000000-0001-4000-8000-000000000013', 'Digital', 'Minor League Baseball', 7500, 3.0, 38.0, 0.80, 1800.00, 1650.00, 'Industry avg MiLB 2025'),

  -- Naming Right: premium asset, high value
  ('a0000000-0001-4000-8000-000000000014', 'Naming Right', 'College D-I Football', 350000, 10.0, 12.0, 0.70, 55000.00, 52000.00, 'Navigate Research 2025'),

  -- Activation Space: experiential, in-venue only
  ('a0000000-0001-4000-8000-000000000015', 'Activation Space', 'College D-I Basketball', 14000, 1.0, 5.0, 0.60, 2800.00, 2500.00, 'Learfield IMG benchmark 2025')

ON CONFLICT (id) DO NOTHING;


-- ---------- claude_context ----------
-- Benchmark and market-rate data used by Claude to evaluate sponsorship assets.

INSERT INTO claude_context
  (id, context_type, content, source, active)
VALUES
  -- Industry CPM benchmarks by medium
  (
    'b0000000-0001-4000-8000-000000000001',
    'valuation_benchmark',
    '{
      "title": "Industry CPM Benchmarks by Medium (2025)",
      "benchmarks": {
        "broadcast_tv_national": {"cpm_low": 25.00, "cpm_high": 45.00, "unit": "USD"},
        "broadcast_tv_regional": {"cpm_low": 12.00, "cpm_high": 28.00, "unit": "USD"},
        "in_venue_signage": {"cpm_low": 5.00, "cpm_high": 15.00, "unit": "USD"},
        "digital_display": {"cpm_low": 8.00, "cpm_high": 22.00, "unit": "USD"},
        "social_media_organic": {"cpm_low": 6.00, "cpm_high": 18.00, "unit": "USD"},
        "social_media_paid": {"cpm_low": 10.00, "cpm_high": 30.00, "unit": "USD"},
        "radio_broadcast": {"cpm_low": 4.00, "cpm_high": 12.00, "unit": "USD"},
        "streaming_overlay": {"cpm_low": 15.00, "cpm_high": 35.00, "unit": "USD"}
      },
      "notes": "CPMs vary by market size, sport, and time slot. College football prime-time skews toward high end."
    }'::jsonb,
    'Compiled from Nielsen Sports, KORE Software, and industry reports 2025',
    true
  ),

  -- Market rates for common college athletics sponsorship assets
  (
    'b0000000-0001-4000-8000-000000000002',
    'market_rate',
    '{
      "title": "College Athletics Sponsorship Asset Market Rates (2025)",
      "tier": "Mid-Major D-I",
      "rates": {
        "led_board_per_game": {"low": 500, "mid": 1500, "high": 4000, "unit": "USD"},
        "jersey_patch_per_season": {"low": 15000, "mid": 50000, "high": 200000, "unit": "USD"},
        "scoreboard_presented_by_per_season": {"low": 8000, "mid": 25000, "high": 75000, "unit": "USD"},
        "pa_read_per_game": {"low": 100, "mid": 350, "high": 800, "unit": "USD"},
        "social_media_post_per_post": {"low": 200, "mid": 750, "high": 2500, "unit": "USD"},
        "radio_read_per_game": {"low": 75, "mid": 250, "high": 600, "unit": "USD"},
        "video_board_spot_per_game": {"low": 300, "mid": 1000, "high": 3500, "unit": "USD"},
        "court_field_logo_per_season": {"low": 10000, "mid": 35000, "high": 100000, "unit": "USD"},
        "naming_rights_per_year": {"low": 50000, "mid": 250000, "high": 1000000, "unit": "USD"},
        "activation_space_per_game": {"low": 200, "mid": 800, "high": 2500, "unit": "USD"}
      },
      "notes": "Rates for Mid-Major D-I programs. Power-5 rates are typically 2-5x higher. Minor league rates are typically 30-60% of Mid-Major."
    }'::jsonb,
    'Learfield IMG College Holdings rate cards and industry surveys 2025',
    true
  ),

  -- Minor league sports sponsorship benchmarks
  (
    'b0000000-0001-4000-8000-000000000003',
    'market_rate',
    '{
      "title": "Minor League Sports Sponsorship Asset Market Rates (2025)",
      "leagues": ["MiLB","ECHL","USL","NLL","NWSL"],
      "rates": {
        "outfield_wall_sign_per_season": {"low": 1500, "mid": 4000, "high": 10000, "unit": "USD"},
        "led_board_per_game": {"low": 150, "mid": 500, "high": 1500, "unit": "USD"},
        "jersey_patch_per_season": {"low": 5000, "mid": 15000, "high": 40000, "unit": "USD"},
        "pa_read_per_game": {"low": 50, "mid": 150, "high": 400, "unit": "USD"},
        "social_media_post_per_post": {"low": 75, "mid": 250, "high": 800, "unit": "USD"},
        "first_pitch_promotion_per_game": {"low": 200, "mid": 500, "high": 1500, "unit": "USD"},
        "concourse_activation_per_game": {"low": 100, "mid": 400, "high": 1200, "unit": "USD"},
        "naming_rights_per_year": {"low": 20000, "mid": 75000, "high": 300000, "unit": "USD"}
      },
      "average_attendance": {"milb_aaa": 7500, "milb_aa": 4500, "echl": 4000, "usl": 5000, "nwsl": 8000},
      "notes": "Minor league valuations are heavily influenced by local market size and stadium capacity."
    }'::jsonb,
    'MiLB Properties, USL Business Intelligence, industry comps 2025',
    true
  ),

  -- Audience multiplier guidance for Claude
  (
    'b0000000-0001-4000-8000-000000000004',
    'audience_data',
    '{
      "title": "Audience & Viewership Benchmarks for Valuation (2025)",
      "college_athletics": {
        "football_power5_avg_tv": 1500000,
        "football_mid_major_avg_tv": 150000,
        "basketball_power5_avg_tv": 800000,
        "basketball_mid_major_avg_tv": 80000,
        "olympic_sport_avg_tv": 15000,
        "football_avg_attendance": 45000,
        "basketball_avg_attendance": 7500
      },
      "minor_league": {
        "milb_aaa_avg_tv": 8000,
        "milb_aa_avg_tv": 3500,
        "milb_avg_attendance": 5500,
        "echl_avg_attendance": 4000
      },
      "multipliers": {
        "rivalry_game": 1.8,
        "conference_tournament": 2.2,
        "ncaa_tournament": 4.0,
        "bowl_game": 3.0,
        "opening_day": 1.5,
        "promotional_night": 1.3
      },
      "notes": "Apply multipliers to base audience when valuing assets for marquee events."
    }'::jsonb,
    'Nielsen Sports, ESPN viewership data, NCAA attendance reports 2025',
    true
  ),

  -- CPP (cost per point) reference
  (
    'b0000000-0001-4000-8000-000000000005',
    'valuation_benchmark',
    '{
      "title": "Cost Per Rating Point (CPP) Benchmarks (2025)",
      "national": {
        "primetime_broadcast": {"cpp": 175, "unit": "USD"},
        "daytime_broadcast": {"cpp": 85, "unit": "USD"},
        "cable_sports": {"cpp": 120, "unit": "USD"},
        "streaming": {"cpp": 95, "unit": "USD"}
      },
      "local_regional": {
        "top_25_dma": {"cpp": 55, "unit": "USD"},
        "dma_26_to_75": {"cpp": 30, "unit": "USD"},
        "dma_76_plus": {"cpp": 15, "unit": "USD"}
      },
      "college_sports_specific": {
        "power5_football": {"cpp": 140, "unit": "USD"},
        "power5_basketball": {"cpp": 110, "unit": "USD"},
        "mid_major_football": {"cpp": 45, "unit": "USD"},
        "mid_major_basketball": {"cpp": 35, "unit": "USD"}
      },
      "notes": "CPP = cost to reach 1% of the TV universe in a given market. Used as a baseline for calculating broadcast EMV."
    }'::jsonb,
    'Nielsen Ad Intel, Kantar Media, industry standard CPP tables 2025',
    true
  )

ON CONFLICT (id) DO NOTHING;
