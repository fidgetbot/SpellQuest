import { defineRailway, project, service } from "railway/iac";
// This repository manages only its own resources in the environment. Other
// repositories export their own partial name.
// See https://docs.railway.com/infrastructure-as-code#multi-repo-projects
export const partial = "web";
export default defineRailway(() => {
  const web = service("web", {
    build: { buildEnvironment: "V3", builder: "DOCKERFILE", dockerfilePath: "Dockerfile" },
    healthcheck: "/readyz",
    healthcheckTimeout: 120,
    replicas: { "us-east4-eqdc4a": 1 },
  });

  return project("word-quest", {
    variables: { managed: false },
    resources: [web],
  });
});
