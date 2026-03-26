// Last Updated: 2026-03-26

interface Env {
	// This binding is not used in the current logic but is kept for future-proofing
	// if we decide to use a third-party Geo-IP service.
	GEOLOCATION_API_KEY: string;
}

// Full regulations data from data/regulations-us.primary.json
// In a production scenario, this would be fetched from a KV store or an API
// to allow for dynamic updates without redeploying the worker.
const regulations = [
  {
    "regulation_id": "US-NV-IGAMING-CURRENT-001",
    "jurisdiction": { "country": "US", "state_code": "NV", "state_name": "Nevada" },
    "topic": "igaming",
    "status": "legal",
    "summary": "Online poker is legal and regulated in Nevada."
  },
  {
    "regulation_id": "US-NV-SPORTSBOOK-CURRENT-001",
    "jurisdiction": { "country": "US", "state_code": "NV", "state_name": "Nevada" },
    "topic": "sportsbook",
    "status": "legal",
    "summary": "Sports betting is fully legal and regulated."
  },
  {
    "regulation_id": "US-NJ-IGAMING-CURRENT-001",
    "jurisdiction": { "country": "US", "state_code": "NJ", "state_name": "New Jersey" },
    "topic": "igaming",
    "status": "legal",
    "summary": "Online casino gaming is fully legal and regulated in New Jersey."
  },
  {
    "regulation_id": "US-NJ-SPORTSBOOK-CURRENT-001",
    "jurisdiction": { "country": "US", "state_code": "NJ", "state_name": "New Jersey" },
    "topic": "sportsbook",
    "status": "legal",
    "summary": "Sportsbook is legal."
  },
  {
    "regulation_id": "US-TX-IGAMING-CURRENT-001",
    "jurisdiction": { "country": "US", "state_code": "TX", "state_name": "Texas" },
    "topic": "igaming",
    "status": "prohibited",
    "summary": "All forms of online casino gaming are strictly prohibited in Texas."
  },
  {
    "regulation_id": "US-TX-SPORTSBOOK-CURRENT-001",
    "jurisdiction": { "country": "US", "state_code": "TX", "state_name": "Texas" },
    "topic": "sportsbook",
    "status": "prohibited",
    "summary": "All forms of sports betting are strictly prohibited in Texas."
  }
];

// Create a map of state codes to their iGaming regulations for quick lookup.
const igamingRegulations = new Map(
	regulations
		.filter(reg => reg.topic === 'igaming')
		.map(reg => [reg.jurisdiction.state_code, reg])
);

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const country = request.cf?.country;
		const state = request.cf?.regionCode;

		let responseBody;
		const headers = { 'Content-Type': 'application/json' };

		if (country === 'US' && state && igamingRegulations.has(state)) {
			// A specific regulation was found for the user's state.
			const regulation = igamingRegulations.get(state);
			responseBody = JSON.stringify({
				message: 'Regulation information for your location.',
				location: {
					country,
					state,
				},
				regulation: {
					status: regulation.status,
					summary: regulation.summary,
				},
			});
		} else {
			// No specific regulation found, or the user is outside the US.
			responseBody = JSON.stringify({
				message: 'No specific iGaming regulations found for your location.',
				location: {
					country: country || 'Unknown',
					state: state || 'Unknown',
				},
			});
		}

		return new Response(responseBody, {
			status: 200,
			headers,
		});
	},
};
