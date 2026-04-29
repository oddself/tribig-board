import type { BoardScene, ClubRole, TaskPriority, TaskStatus } from "@/lib/types/domain";

export type LocalMember = {
  id: string;
  fullName: string;
  email: string;
  role: ClubRole;
};

export type LocalTask = {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignedTo: string;
  dueDate: string;
};

export type LocalProject = {
  id: string;
  clubId: string;
  name: string;
  description: string;
  tasks: LocalTask[];
  notes: string;
  boardScene: BoardScene;
};

export type LocalClub = {
  id: string;
  name: string;
  description: string;
  members: LocalMember[];
  projects: LocalProject[];
};

export type LocalDemoData = {
  clubs: LocalClub[];
};

export type LocalSelection = {
  activeClubId: string;
  activeProjectId: string;
};

export type LocalDemoPayload = {
  data: LocalDemoData;
  updatedAt: string;
};

export const seedLocalDemoData: LocalDemoData = {
  clubs: [
    {
      id: "club-design",
      name: "Tribig Design Club",
      description: "University club workspace for events, product ideas, and visual planning.",
      members: [
        { id: "member-aylin", fullName: "Aylin Kaya", email: "aylin@university.edu", role: "owner" },
        { id: "member-emir", fullName: "Emir Demir", email: "emir@university.edu", role: "editor" },
        { id: "member-deniz", fullName: "Deniz Arslan", email: "deniz@university.edu", role: "member" }
      ],
      projects: [
        {
          id: "project-summit",
          clubId: "club-design",
          name: "Spring Tech Summit",
          description: "Plan speakers, booth layout, sponsors, and volunteer tasks.",
          notes:
            "# Weekly meeting\n\n- Confirm auditorium availability\n- Prepare sponsor deck\n- Assign social media visuals\n\n## Next steps\n\nEmir owns speaker outreach, Deniz owns volunteer schedule.",
          boardScene: {},
          tasks: [
            {
              id: "task-venue",
              title: "Confirm venue booking",
              description: "Ask student affairs for final auditorium confirmation.",
              status: "todo",
              priority: "high",
              assignedTo: "member-aylin",
              dueDate: "2026-05-06"
            },
            {
              id: "task-sponsors",
              title: "Draft sponsor package",
              description: "One-page PDF with audience, benefits, and tiers.",
              status: "in_progress",
              priority: "medium",
              assignedTo: "member-emir",
              dueDate: "2026-05-10"
            },
            {
              id: "task-visuals",
              title: "Publish announcement visuals",
              description: "Instagram post and story format.",
              status: "done",
              priority: "low",
              assignedTo: "member-deniz",
              dueDate: "2026-05-02"
            }
          ]
        }
      ]
    }
  ]
};

export function normalizeLocalDemoData(data: LocalDemoData): LocalDemoData {
  return {
    clubs: Array.isArray(data.clubs)
      ? data.clubs.map((club) => ({
          ...club,
          members: Array.isArray(club.members) ? club.members : [],
          projects: Array.isArray(club.projects)
            ? club.projects.map((project) => ({
                ...project,
                clubId: project.clubId || club.id,
                tasks: Array.isArray(project.tasks) ? project.tasks : [],
                notes: typeof project.notes === "string" ? project.notes : "",
                boardScene: project.boardScene ?? {}
              }))
            : []
        }))
      : []
  };
}

export function getDefaultSelection(data: LocalDemoData): LocalSelection {
  const club = data.clubs[0];
  const project = club?.projects[0];

  return {
    activeClubId: club?.id ?? "",
    activeProjectId: project?.id ?? ""
  };
}

export function normalizeLocalSelection(data: LocalDemoData, selection: LocalSelection): LocalSelection {
  const activeClub = data.clubs.find((club) => club.id === selection.activeClubId) ?? data.clubs[0];
  const activeProject =
    activeClub?.projects.find((project) => project.id === selection.activeProjectId) ?? activeClub?.projects[0];

  return {
    activeClubId: activeClub?.id ?? "",
    activeProjectId: activeProject?.id ?? ""
  };
}
