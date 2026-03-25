export type Workspace = {
  id: string;
  name: string;
  supabaseUrl: string;
  anonKey: string;
  schemas: { name: string; label: string }[];
  hasMasterFeed: boolean;
  schemaColors: Record<string, string>;
};

export const WORKSPACES: Workspace[] = [
  {
    id: "yasin-brain",
    name: "Yasin Brain",
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    schemas: [
      { name: "memdb", label: "Memory DB" },
      { name: "sessiondb", label: "Sessions" },
      { name: "worlddb", label: "World DB" },
      { name: "yasin_info", label: "Yasin Info" },
    ],
    hasMasterFeed: true,
    schemaColors: {
      memdb: "bg-blue-900/40 text-blue-300",
      sessiondb: "bg-green-900/40 text-green-300",
      worlddb: "bg-purple-900/40 text-purple-300",
      yasin_info: "bg-amber-900/40 text-amber-300",
    },
  },
  {
    id: "leanscale-brain",
    name: "LeanScale Brain",
    supabaseUrl: process.env.NEXT_PUBLIC_LEANSCALE_SUPABASE_URL!,
    anonKey: process.env.NEXT_PUBLIC_LEANSCALE_SUPABASE_ANON_KEY!,
    schemas: [
      { name: "company_context", label: "Company Context" },
      { name: "content", label: "Content" },
      { name: "interviews", label: "Interviews" },
      { name: "meeting_transcripts", label: "Meeting Transcripts" },
      { name: "playbooks", label: "Playbooks" },
      { name: "slack_db", label: "Slack DB" },
    ],
    hasMasterFeed: false,
    schemaColors: {
      company_context: "bg-teal-900/40 text-teal-300",
      content: "bg-rose-900/40 text-rose-300",
      interviews: "bg-indigo-900/40 text-indigo-300",
      meeting_transcripts: "bg-orange-900/40 text-orange-300",
      playbooks: "bg-cyan-900/40 text-cyan-300",
      slack_db: "bg-lime-900/40 text-lime-300",
    },
  },
];

export function getWorkspace(id: string): Workspace | undefined {
  return WORKSPACES.find((w) => w.id === id);
}

export const DEFAULT_WORKSPACE = WORKSPACES[0];

/** Get all known schema names across all workspaces */
export function getAllSchemaNames(): string[] {
  return WORKSPACES.flatMap((w) => w.schemas.map((s) => s.name));
}

/** Find which workspace a schema belongs to (for backwards compat hash parsing) */
export function findWorkspaceBySchema(schemaName: string): Workspace | undefined {
  return WORKSPACES.find((w) => w.schemas.some((s) => s.name === schemaName));
}
