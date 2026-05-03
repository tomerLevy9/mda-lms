# PassDMV Question Bank

## Structure

Questions are organized by state in separate JSON files:

```
data/questions/
├── README.md              ← You are here
├── schema.json            ← JSON Schema for validation
├── california.json        ← California questions
├── texas.json             ← Texas questions
├── florida.json           ← Florida questions
├── new-york.json          ← New York questions
├── illinois.json          ← Illinois questions
└── ...                    ← One file per state
```

## How to Add/Update Questions

1. Open the state JSON file (e.g., `california.json`)
2. Add questions following the schema below
3. Each question needs a unique `id` (format: `{state}-{category}-{number}`, e.g., `CA-signs-042`)
4. Validate against `schema.json` before deploying
5. Questions are loaded at build time — redeploy after updates

## Question Schema

Each question object has these fields:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Unique ID: `{STATE}-{category}-{number}` |
| `state` | string | Yes | Two-letter state code (e.g., "CA") |
| `category` | enum | Yes | One of the defined categories |
| `difficulty` | enum | Yes | `easy`, `medium`, `hard` |
| `type` | enum | Yes | `multiple_choice`, `true_false`, `image_based` |
| `question` | string | Yes | The question text |
| `options` | array | Yes | 2-4 answer options |
| `correctAnswer` | number | Yes | Index of correct option (0-based) |
| `explanation` | string | Yes | Why the answer is correct |
| `imageUrl` | string | No | Path to image (for sign/signal questions) |
| `tags` | array | No | Additional tags for filtering |
| `source` | string | No | Reference to official handbook section |
| `lastUpdated` | string | No | ISO date of last review |

## Categories

| Category Slug | Display Name |
|--------------|--------------|
| `road-signs` | Road Signs |
| `right-of-way` | Right of Way |
| `parking` | Parking Rules |
| `speed-limits` | Speed Limits |
| `traffic-signals` | Traffic Signals |
| `lane-usage` | Lane Usage |
| `dui-dwi` | DUI / DWI Laws |
| `emergency-vehicles` | Emergency Vehicles |
| `school-zones` | School Zones |
| `insurance-registration` | Insurance & Registration |
| `general-knowledge` | General Knowledge |

## Validation

Run validation before deploying:

```bash
npm run validate-questions
```

This checks:
- All required fields are present
- IDs are unique across all files
- `correctAnswer` index is within `options` range
- Categories and difficulty values are valid
- No duplicate questions (fuzzy match on question text)
