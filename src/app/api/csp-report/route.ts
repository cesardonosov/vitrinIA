import { cspReportHandler } from "@/infra/container";

export async function POST(request: Request) {
  return cspReportHandler(request);
}
