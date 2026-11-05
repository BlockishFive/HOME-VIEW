import { configureOwner } from "../../lib/server/private-store";
export default async function setup() {
  if (!process.env.HOME_VIEW_TEST_DATA_DIR)
    throw new Error("Missing isolated test data directory");
  process.env.HOME_VIEW_DATA_DIR = process.env.HOME_VIEW_TEST_DATA_DIR;
  configureOwner("pilot", "Fictitious-browser-pilot-2026", true);
}
