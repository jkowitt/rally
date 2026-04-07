// Industry configuration — drives terminology, categories, valuations, and AI prompts
// Keyed by property.type from the database

const CONFIGS = {
  // ─── SPORTS ───
  college: sportsConfig('College Athletics'),
  professional: sportsConfig('Professional Sports'),
  minor_league: sportsConfig('Minor League Sports'),

  // ─── ENTERTAINMENT ───
  entertainment: {
    label: 'Entertainment Partnerships',
    industryName: 'Entertainment',
    moduleLabels: { sportify: 'VenueOps', valora: 'ValueIQ', businessnow: 'Business Now' },
    terminology: { asset: 'Placement', sponsor: 'Partner', property: 'Venue', deal: 'Partnership', prospect: 'Partner Lead', fulfillment: 'Delivery', benefit: 'Deliverable' },
    hiddenModules: [],
    assetCategories: [
      'Stage Banner', 'VIP Lounge Naming', 'Bar/Concession Branding', 'Ticket Back Ad',
      'Wristband Branding', 'Social Post', 'Email/Newsletter', 'Website Banner',
      'Video Screen Ad', 'PA Announcement', 'Sampling/Giveaway', 'Meet & Greet',
      'VIP Experience', 'Branded Content', 'Podcast/Audio', 'Print Ad',
      'Merch Table Branding', 'Photo Booth Sponsorship', 'Parking/Signage', 'Digital',
    ],
    assetIcons: {
      'Stage Banner': '🎭', 'VIP Lounge Naming': '🥂', 'Bar/Concession Branding': '🍺',
      'Ticket Back Ad': '🎟️', 'Wristband Branding': '📿', 'Social Post': '📱',
      'Email/Newsletter': '✉️', 'Website Banner': '🌐', 'Video Screen Ad': '📺',
      'PA Announcement': '📢', 'Sampling/Giveaway': '🎁', 'Meet & Greet': '🤝',
      'VIP Experience': '⭐', 'Branded Content': '🎬', 'Podcast/Audio': '🎧',
      'Print Ad': '📰', 'Merch Table Branding': '👕', 'Photo Booth Sponsorship': '📸',
      'Parking/Signage': '🪧', 'Digital': '💻',
    },
    eventTypes: ['Concert', 'Festival', 'Comedy Show', 'Theater', 'Private Event', 'Club Night', 'Other'],
    valoraModel: {
      name: 'Attendance Value',
      outputLabel: 'Estimated Partnership Value',
      inputs: [
        { key: 'event_attendance', label: 'Event Attendance', type: 'number' },
        { key: 'impressions_per_person', label: 'Impressions per Person', type: 'number', default: 3 },
        { key: 'dwell_minutes', label: 'Avg Dwell Time (min)', type: 'number', default: 120 },
        { key: 'cpm_rate', label: 'CPM Rate ($)', type: 'number', default: 25 },
      ],
      calculate: (v) => (v.event_attendance || 0) * (v.impressions_per_person || 3) * ((v.dwell_minutes || 120) / 60) * ((v.cpm_rate || 25) / 1000),
    },
    newsletterTitle: 'The Entertainment Partnership Weekly',
    afternoonTitle: 'Afternoon Pulse',
    newsletterTopic: 'entertainment and venue partnerships, concert sponsorships, festival deals, live event marketing',
    newsletterSources: 'Pollstar, Billboard, Variety, Eventbrite Blog, IEG',
    prospectPrompt: 'Find brands that sponsor concerts, festivals, music venues, and live entertainment events',
    companyCategories: [
      'Beverage & Alcohol', 'Fashion & Apparel', 'Technology & Software', 'Automotive',
      'Streaming & Media', 'Hospitality & Travel', 'Consumer Electronics', 'Food & QSR',
      'Telecom', 'Energy', 'Cannabis', 'Lifestyle & Wellness',
    ],
  },

  // ─── CONFERENCE / TRADE SHOW ───
  conference: {
    label: 'Event & Conference Partnerships',
    industryName: 'Events & Conferences',
    moduleLabels: { sportify: 'EventOps', valora: 'ValueIQ', businessnow: 'Business Now' },
    terminology: { asset: 'Package Item', sponsor: 'Exhibitor', property: 'Event Organization', deal: 'Sponsorship', prospect: 'Exhibitor Lead', fulfillment: 'Delivery', benefit: 'Deliverable' },
    hiddenModules: [],
    assetCategories: [
      'Booth Space', 'Keynote Sponsorship', 'Lanyard/Badge Branding', 'WiFi Sponsorship',
      'App Sponsorship', 'Breakout Room Naming', 'Charging Station', 'Registration Sponsor',
      'Networking Event', 'Lunch/Coffee Sponsorship', 'Welcome Reception', 'Swag Bag Insert',
      'Email/Newsletter', 'Website Banner', 'Social Post', 'Print Ad',
      'Video Screen Ad', 'Award Sponsorship', 'After Party', 'Digital',
    ],
    assetIcons: {
      'Booth Space': '🏪', 'Keynote Sponsorship': '🎤', 'Lanyard/Badge Branding': '🏷️',
      'WiFi Sponsorship': '📶', 'App Sponsorship': '📲', 'Breakout Room Naming': '🚪',
      'Charging Station': '🔋', 'Registration Sponsor': '📋', 'Networking Event': '🤝',
      'Lunch/Coffee Sponsorship': '☕', 'Welcome Reception': '🥂', 'Swag Bag Insert': '🎁',
      'Email/Newsletter': '✉️', 'Website Banner': '🌐', 'Social Post': '📱',
      'Print Ad': '📰', 'Video Screen Ad': '📺', 'Award Sponsorship': '🏆',
      'After Party': '🎉', 'Digital': '💻',
    },
    eventTypes: ['Conference', 'Trade Show', 'Summit', 'Workshop', 'Webinar', 'Networking Event', 'Awards Ceremony', 'Other'],
    valoraModel: {
      name: 'Lead Value',
      outputLabel: 'Estimated Sponsorship Value',
      inputs: [
        { key: 'registrations', label: 'Total Registrations', type: 'number' },
        { key: 'booth_visits', label: 'Est. Booth Visits', type: 'number' },
        { key: 'avg_lead_value', label: 'Avg Lead Value ($)', type: 'number', default: 50 },
        { key: 'brand_exposure_rate', label: 'Brand Exposure Rate ($)', type: 'number', default: 5 },
      ],
      calculate: (v) => ((v.booth_visits || 0) * (v.avg_lead_value || 50)) + ((v.registrations || 0) * (v.brand_exposure_rate || 5)),
    },
    newsletterTitle: 'The Event Industry Weekly',
    afternoonTitle: 'Afternoon Brief',
    newsletterTopic: 'conference sponsorships, trade show exhibitor trends, event technology, attendee engagement',
    newsletterSources: 'PCMA, MPI, EventMB, BizBash, Skift Meetings',
    prospectPrompt: 'Find companies that exhibit at trade shows, sponsor conferences, and invest in B2B event marketing',
    companyCategories: [
      'Technology & Software', 'Banking & Financial Services', 'Healthcare', 'Education',
      'Manufacturing', 'Telecommunications', 'Consulting', 'Insurance', 'Retail', 'Travel',
    ],
  },

  // ─── NONPROFIT ───
  nonprofit: {
    label: 'Nonprofit Partnerships',
    industryName: 'Nonprofit & Philanthropy',
    moduleLabels: { sportify: 'Programs', valora: 'ImpactIQ', businessnow: 'Business Now' },
    terminology: { asset: 'Recognition Item', sponsor: 'Corporate Partner', property: 'Organization', deal: 'Partnership', prospect: 'Donor Lead', fulfillment: 'Recognition', benefit: 'Recognition Item' },
    hiddenModules: [],
    assetCategories: [
      'Title Sponsorship', 'Table Sponsorship', 'Program Ad', 'Naming Opportunity',
      'Logo Placement', 'Social Post', 'Email/Newsletter', 'Website Banner',
      'Event Signage', 'Award Naming', 'Scholarship Naming', 'Silent Auction',
      'Branded Content', 'Press Release Mention', 'Annual Report Recognition', 'Digital',
    ],
    assetIcons: {
      'Title Sponsorship': '🏆', 'Table Sponsorship': '🍽️', 'Program Ad': '📰',
      'Naming Opportunity': '🏛️', 'Logo Placement': '🖼️', 'Social Post': '📱',
      'Email/Newsletter': '✉️', 'Website Banner': '🌐', 'Event Signage': '🪧',
      'Award Naming': '🏅', 'Scholarship Naming': '🎓', 'Silent Auction': '🔨',
      'Branded Content': '🎬', 'Press Release Mention': '📣', 'Annual Report Recognition': '📊',
      'Digital': '💻',
    },
    eventTypes: ['Gala', 'Fundraiser', 'Benefit Concert', 'Golf Tournament', 'Charity Run', 'Volunteer Event', 'Auction', 'Other'],
    valoraModel: {
      name: 'Donor Exposure',
      outputLabel: 'Estimated Partnership Impact',
      inputs: [
        { key: 'event_attendance', label: 'Event Attendance', type: 'number' },
        { key: 'social_reach', label: 'Social Media Reach', type: 'number' },
        { key: 'media_mentions', label: 'Media Mentions', type: 'number' },
        { key: 'donor_tier_multiplier', label: 'Donor Tier Multiplier', type: 'number', default: 1.5 },
      ],
      calculate: (v) => ((v.event_attendance || 0) + (v.social_reach || 0) / 10 + (v.media_mentions || 0) * 500) * (v.donor_tier_multiplier || 1.5),
    },
    newsletterTitle: 'The Giving Partners Weekly',
    afternoonTitle: 'Afternoon Impact',
    newsletterTopic: 'corporate giving programs, CSR trends, nonprofit fundraising, philanthropy partnerships',
    newsletterSources: 'Chronicle of Philanthropy, NonProfit PRO, Philanthropy News Digest, Giving USA',
    prospectPrompt: 'Find corporations with active CSR programs, corporate giving, community investment, and nonprofit partnership budgets',
    companyCategories: [
      'Banking & Financial Services', 'Healthcare', 'Technology & Software', 'Energy & Utilities',
      'Insurance', 'Retail', 'Real Estate', 'Automotive', 'Food & Quick Serve Restaurants',
    ],
  },

  // ─── MEDIA / PUBLISHING ───
  media: {
    label: 'Media & Ad Sales',
    industryName: 'Media & Publishing',
    moduleLabels: { sportify: 'ContentOps', valora: 'AdPriceIQ', businessnow: 'Business Now' },
    terminology: { asset: 'Ad Placement', sponsor: 'Advertiser', property: 'Publication', deal: 'Campaign', prospect: 'Advertiser Lead', fulfillment: 'Impression Delivery', benefit: 'Placement' },
    hiddenModules: [],
    assetCategories: [
      'Display Ad', 'Sponsored Article', 'Newsletter Sponsorship', 'Podcast Ad Read',
      'Video Pre-Roll', 'Banner Ad', 'Native Content', 'Email Blast',
      'Social Post', 'Webinar Sponsorship', 'Event Sponsorship', 'Print Ad',
      'Classified Ad', 'Homepage Takeover', 'Branded Content', 'Digital',
    ],
    assetIcons: {
      'Display Ad': '🖼️', 'Sponsored Article': '📝', 'Newsletter Sponsorship': '✉️',
      'Podcast Ad Read': '🎧', 'Video Pre-Roll': '🎬', 'Banner Ad': '🌐',
      'Native Content': '📄', 'Email Blast': '📧', 'Social Post': '📱',
      'Webinar Sponsorship': '💻', 'Event Sponsorship': '🎤', 'Print Ad': '📰',
      'Classified Ad': '📋', 'Homepage Takeover': '🏠', 'Branded Content': '🎭',
      'Digital': '💻',
    },
    eventTypes: ['Webinar', 'Live Stream', 'Conference', 'Workshop', 'Product Launch', 'Other'],
    valoraModel: {
      name: 'Ad Value',
      outputLabel: 'Estimated Ad Value',
      inputs: [
        { key: 'impressions', label: 'Total Impressions', type: 'number' },
        { key: 'ctr', label: 'Click-Through Rate (%)', type: 'number', default: 2 },
        { key: 'cpc', label: 'Cost per Click ($)', type: 'number', default: 1.5 },
        { key: 'placement_premium', label: 'Placement Premium', type: 'number', default: 1.0 },
      ],
      calculate: (v) => (v.impressions || 0) * ((v.ctr || 2) / 100) * (v.cpc || 1.5) * (v.placement_premium || 1),
    },
    newsletterTitle: 'The Ad Revenue Weekly',
    afternoonTitle: 'Afternoon Signal',
    newsletterTopic: 'advertising revenue trends, programmatic ads, publisher monetization, media buying, brand partnerships',
    newsletterSources: 'Ad Age, Digiday, AdExchanger, MediaPost, Adweek',
    prospectPrompt: 'Find brands and agencies actively buying advertising, sponsored content, and media partnerships',
    companyCategories: [
      'Technology & Software', 'Financial Services', 'Automotive', 'Consumer Packaged Goods',
      'Retail', 'Healthcare', 'Travel', 'Education', 'Food & Beverage', 'Telecom',
    ],
  },

  // ─── ESPORTS ───
  esports: {
    label: 'Esports Partnerships',
    industryName: 'Esports & Gaming',
    moduleLabels: { sportify: 'TourneyOps', valora: 'StreamValue', businessnow: 'Business Now' },
    terminology: { asset: 'Asset', sponsor: 'Partner', property: 'Team/Org', deal: 'Deal', prospect: 'Partner Lead', fulfillment: 'Delivery', benefit: 'Deliverable' },
    hiddenModules: [],
    assetCategories: [
      'Jersey/Team Branding', 'Stream Overlay', 'Social Post', 'Tournament Naming',
      'In-Game Integration', 'Content Series', 'Podcast/Audio', 'Email/Newsletter',
      'Website Banner', 'Discord Integration', 'Merch Collab', 'Player Feature',
      'Branded Content', 'Watch Party Activation', 'VIP Experience', 'Digital',
    ],
    assetIcons: {
      'Jersey/Team Branding': '👕', 'Stream Overlay': '📺', 'Social Post': '📱',
      'Tournament Naming': '🏆', 'In-Game Integration': '🎮', 'Content Series': '🎬',
      'Podcast/Audio': '🎧', 'Email/Newsletter': '✉️', 'Website Banner': '🌐',
      'Discord Integration': '💬', 'Merch Collab': '🛍️', 'Player Feature': '⭐',
      'Branded Content': '🎭', 'Watch Party Activation': '🎉', 'VIP Experience': '🎫',
      'Digital': '💻',
    },
    eventTypes: ['Tournament', 'Scrimmage', 'Watch Party', 'Fan Meet', 'Content Shoot', 'Other'],
    valoraModel: {
      name: 'Stream Value',
      outputLabel: 'Estimated Stream Value',
      inputs: [
        { key: 'concurrent_viewers', label: 'Avg Concurrent Viewers', type: 'number' },
        { key: 'stream_hours', label: 'Stream Hours', type: 'number' },
        { key: 'vod_views', label: 'VOD Views', type: 'number' },
        { key: 'cpm_rate', label: 'CPM Rate ($)', type: 'number', default: 15 },
      ],
      calculate: (v) => ((v.concurrent_viewers || 0) * (v.stream_hours || 1) * 60 + (v.vod_views || 0)) * ((v.cpm_rate || 15) / 1000),
    },
    newsletterTitle: 'The Gaming Business Weekly',
    afternoonTitle: 'Afternoon GG',
    newsletterTopic: 'esports sponsorship deals, gaming partnerships, streaming monetization, tournament sponsorships',
    newsletterSources: 'The Esports Observer, Dot Esports, Dexerto, GamesBeat, Esports Insider',
    prospectPrompt: 'Find brands that sponsor esports teams, gaming tournaments, and streaming content creators',
    companyCategories: [
      'Technology & Software', 'Gaming & Esports', 'Energy Drinks', 'Consumer Electronics',
      'Fashion & Apparel', 'Food & QSR', 'Automotive', 'Telecom', 'Streaming',
    ],
  },

  // ─── REAL ESTATE ───
  realestate: {
    label: 'Real Estate Operations',
    industryName: 'Real Estate',
    moduleLabels: { sportify: 'PropertyOps', valora: 'MarketValue', businessnow: 'Business Now' },
    terminology: { asset: 'Unit/Space', sponsor: 'Tenant', property: 'Property Group', deal: 'Lease', prospect: 'Tenant Lead', fulfillment: 'Build-Out', benefit: 'Lease Term' },
    hiddenModules: [],
    assetCategories: [
      'Office Suite', 'Retail Space', 'Warehouse Unit', 'Flex Space', 'Conference Room',
      'Parking Space', 'Storage Unit', 'Common Area', 'Rooftop/Patio', 'Billboard',
      'Digital Screen', 'Lobby Display', 'Building Wrap', 'Directory Listing',
      'Website Banner', 'Email/Newsletter',
    ],
    assetIcons: {
      'Office Suite': '🏢', 'Retail Space': '🏪', 'Warehouse Unit': '📦', 'Flex Space': '🔧',
      'Conference Room': '🤝', 'Parking Space': '🅿️', 'Storage Unit': '🗄️', 'Common Area': '🛋️',
      'Rooftop/Patio': '☀️', 'Billboard': '🪧', 'Digital Screen': '📺', 'Lobby Display': '🖼️',
      'Building Wrap': '🏗️', 'Directory Listing': '📋', 'Website Banner': '🌐', 'Email/Newsletter': '✉️',
    },
    eventTypes: ['Open House', 'Broker Tour', 'Community Event', 'Tenant Appreciation', 'Grand Opening', 'Other'],
    valoraModel: {
      name: 'Lease Value',
      outputLabel: 'Estimated Annual Lease Value',
      inputs: [
        { key: 'square_feet', label: 'Square Feet', type: 'number' },
        { key: 'price_per_sqft', label: 'Price per Sq Ft ($)', type: 'number', default: 25 },
        { key: 'occupancy_rate', label: 'Occupancy Rate (%)', type: 'number', default: 90 },
        { key: 'lease_years', label: 'Lease Term (years)', type: 'number', default: 3 },
      ],
      calculate: (v) => (v.square_feet || 0) * (v.price_per_sqft || 25) * ((v.occupancy_rate || 90) / 100),
    },
    newsletterTitle: 'The Property Market Weekly',
    afternoonTitle: 'Afternoon Listing',
    newsletterTopic: 'commercial real estate trends, leasing market, property management, tenant retention, CRE technology',
    newsletterSources: 'CoStar, Commercial Observer, Bisnow, GlobeSt, NAIOP',
    prospectPrompt: 'Find businesses looking for commercial real estate, office space, retail locations, and warehouse space',
    companyCategories: [
      'Technology & Software', 'Healthcare', 'Financial Services', 'Retail',
      'Food & Quick Serve Restaurants', 'Legal Services', 'Education', 'Manufacturing',
      'Government', 'Nonprofit',
    ],
  },

  // ─── AGENCY ───
  agency: {
    label: 'Agency Operations',
    industryName: 'Agency',
    moduleLabels: { sportify: 'ProjectOps', valora: 'ValueScope', businessnow: 'Business Now' },
    terminology: { asset: 'Service', sponsor: 'Client', property: 'Agency', deal: 'Engagement', prospect: 'Lead', fulfillment: 'Deliverable', benefit: 'Scope Item' },
    hiddenModules: [],
    assetCategories: [
      'Strategy & Planning', 'Creative/Design', 'Media Buying', 'Social Media Management',
      'Content Production', 'PR & Communications', 'Event Management', 'Influencer Campaign',
      'SEO/SEM', 'Email Marketing', 'Analytics & Reporting', 'Brand Development',
      'Video Production', 'Photography', 'Web Development', 'Consulting',
    ],
    assetIcons: {
      'Strategy & Planning': '📋', 'Creative/Design': '🎨', 'Media Buying': '📺',
      'Social Media Management': '📱', 'Content Production': '🎬', 'PR & Communications': '📣',
      'Event Management': '🎤', 'Influencer Campaign': '⭐', 'SEO/SEM': '🔍',
      'Email Marketing': '✉️', 'Analytics & Reporting': '📊', 'Brand Development': '💎',
      'Video Production': '🎥', 'Photography': '📸', 'Web Development': '💻', 'Consulting': '🤝',
    },
    eventTypes: ['Client Kickoff', 'Quarterly Review', 'Campaign Launch', 'Workshop', 'Pitch Meeting', 'Other'],
    valoraModel: {
      name: 'Engagement Value',
      outputLabel: 'Estimated Engagement Value',
      inputs: [
        { key: 'monthly_retainer', label: 'Monthly Retainer ($)', type: 'number' },
        { key: 'contract_months', label: 'Contract Length (months)', type: 'number', default: 12 },
        { key: 'project_fees', label: 'Project Fees ($)', type: 'number', default: 0 },
        { key: 'media_spend_commission', label: 'Media Commission ($)', type: 'number', default: 0 },
      ],
      calculate: (v) => ((v.monthly_retainer || 0) * (v.contract_months || 12)) + (v.project_fees || 0) + (v.media_spend_commission || 0),
    },
    newsletterTitle: 'The Agency Weekly',
    afternoonTitle: 'Afternoon Brief',
    newsletterTopic: 'agency new business, client retention, marketing trends, pitch strategies, agency operations',
    newsletterSources: 'Ad Age, Adweek, Digiday, Campaign, AgencySpy, The Drum',
    prospectPrompt: 'Find companies looking for marketing agencies, PR firms, creative services, and consulting partners',
    companyCategories: [
      'Technology & Software', 'Consumer Packaged Goods', 'Healthcare', 'Financial Services',
      'Retail', 'Automotive', 'Food & Beverage', 'Entertainment & Media', 'Travel & Hospitality',
      'Education', 'Nonprofit',
    ],
  },

  // ─── DEFAULT / OTHER ───
  other: sportsConfig('Partnership Management'),
}

// Sports is the default / most detailed config
function sportsConfig(label) {
  return {
    label,
    industryName: 'Sports',
    moduleLabels: { sportify: 'Sportify', valora: 'VALORA', businessnow: 'Business Now' },
    terminology: { asset: 'Asset', sponsor: 'Sponsor', property: 'Property', deal: 'Deal', prospect: 'Prospect', fulfillment: 'Fulfillment', benefit: 'Benefit' },
    hiddenModules: [],
    assetCategories: [
      'LED Board', 'Jersey Patch', 'Radio Read', 'Social Post', 'Naming Right', 'Signage', 'Activation Space', 'Digital',
      'Title Sponsorship', 'Hospitality', 'Print Ad', 'Email/Newsletter', 'Website Banner', 'PA Announcement',
      'First Pitch/Puck Drop', 'Halftime', 'Sampling/Giveaway', 'VIP Experience', 'Press Conference',
      'Community Event', 'Branded Content', 'Podcast/Audio',
    ],
    assetIcons: {
      'LED Board': '📺', 'Jersey Patch': '👕', 'Radio Read': '📻', 'Social Post': '📱',
      'Naming Right': '🏟️', 'Signage': '🪧', 'Activation Space': '🎪', 'Digital': '💻',
      'Title Sponsorship': '🏆', 'Hospitality': '🍽️', 'Print Ad': '📰', 'Email/Newsletter': '✉️',
      'Website Banner': '🌐', 'PA Announcement': '📢', 'First Pitch/Puck Drop': '⚾',
      'Halftime': '🎤', 'Sampling/Giveaway': '🎁', 'VIP Experience': '⭐',
      'Press Conference': '🎙️', 'Community Event': '🤝', 'Branded Content': '🎬', 'Podcast/Audio': '🎧',
    },
    eventTypes: ['Game Day', 'Tournament', 'Banquet', 'Clinic', 'Fundraiser', 'Other'],
    valoraModel: {
      name: 'Broadcast EMV',
      outputLabel: 'Estimated Media Value',
      inputs: [
        { key: 'broadcast_minutes', label: 'Broadcast Minutes', type: 'number' },
        { key: 'screen_share_percent', label: 'Screen Share %', type: 'number' },
        { key: 'clarity_score', label: 'Clarity Score (0-1)', type: 'number', default: 1.0 },
        { key: 'audience_size', label: 'Audience Size', type: 'number' },
        { key: 'cpp', label: 'CPP ($)', type: 'number' },
      ],
      calculate: (v) => (v.broadcast_minutes || 0) * ((v.screen_share_percent || 0) / 100) * (v.clarity_score || 1) * ((v.audience_size || 0) / 1000) * (v.cpp || 0),
    },
    newsletterTitle: 'The Sports Business Weekly',
    afternoonTitle: 'Afternoon Access',
    newsletterTopic: 'sports sponsorship deals, partnership trends, media rights, NIL, sports marketing',
    newsletterSources: 'SportBusiness Journal, Front Office Sports, Forbes, Sportico, The Athletic, ESPN, Ad Age',
    prospectPrompt: 'Find companies that sponsor sports teams, athletic departments, and sports events',
    companyCategories: [
      'Automotive', 'Banking & Financial Services', 'Beverage & Alcohol', 'Consumer Packaged Goods',
      'Energy & Utilities', 'Entertainment & Media', 'Fashion & Apparel', 'Food & Quick Serve Restaurants',
      'Gaming & Esports', 'Healthcare', 'Hospitality & Travel', 'Insurance',
      'Real Estate & Construction', 'Retail', 'Sports & Fitness', 'Technology & Software', 'Telecommunications',
    ],
  }
}

export function getIndustryConfig(propertyType) {
  return CONFIGS[propertyType] || CONFIGS.other
}

export function getTerminology(propertyType) {
  return getIndustryConfig(propertyType).terminology
}

export function getAssetCategories(propertyType) {
  return getIndustryConfig(propertyType).assetCategories
}

export function getAssetIcons(propertyType) {
  return getIndustryConfig(propertyType).assetIcons
}

export function getEventTypes(propertyType) {
  return getIndustryConfig(propertyType).eventTypes
}

export function getValoraModel(propertyType) {
  return getIndustryConfig(propertyType).valoraModel
}

export function getModuleLabels(propertyType) {
  return getIndustryConfig(propertyType).moduleLabels
}

export default CONFIGS
