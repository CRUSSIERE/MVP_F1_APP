export interface Meeting {
  meeting_key: number;
  meeting_name: string;
  meeting_official_name: string;
  country_name: string;
  circuit_short_name: string;
  location: string;
  date_start: string;
  year: number;
}

export interface Session {
  session_key: number;
  meeting_key: number;
  session_name: string;
  session_type: string;
  country_name: string;
  circuit_short_name: string;
  location: string;
  date_start: string;
  date_end: string;
  year: number;
}

export interface Driver {
  driver_number: number;
  session_key: number;
  broadcast_name: string;
  full_name: string;
  name_acronym: string;
  team_name: string;
  team_colour: string;
  headshot_url?: string;
}

export interface LocationPoint {
  date: string;
  driver_number: number;
  session_key: number;
  x: number;
  y: number;
  z: number;
}

export interface CarData {
  date: string;
  driver_number: number;
  session_key: number;
  speed: number;
  throttle: number;
  brake: number;
  n_gear: number;
  rpm: number;
  drs: number;
}

export interface Interval {
  date: string;
  driver_number: number;
  session_key: number;
  gap_to_leader: number | string | null;
  interval: number | string | null;
}

export interface Lap {
  date_start: string;
  driver_number: number;
  session_key: number;
  lap_number: number;
  lap_duration: number | null;
  is_pit_out_lap: boolean;
}
