import { render, screen } from "@/test/render";
import { describe, expect, it } from "vitest";
import { TaxonomyProvider, useTaxonomyContext } from "./context";
import { LOCAL_VOCABULARY_KEY } from "@/features/import-export/vocabulary";
function Probe() { const taxonomy = useTaxonomyContext(); return <p data-testid="vocabulary">{JSON.stringify({ tags: taxonomy.tags.map(tag => tag.name), categories: taxonomy.categories, editable: taxonomy.editable })}</p>; }
describe("personal vocabulary instead of demo tags", () => {
  it("has no seeded tags without a provider", () => {
    render(<Probe />); expect(screen.getByTestId("vocabulary")).toHaveTextContent('{"tags":[],"categories":[],"editable":false}');
  });
  it("starts the signed-out catalogue empty", () => {
    render(<TaxonomyProvider workspaceId={null} ownerId={null}><Probe /></TaxonomyProvider>);
    expect(screen.getByTestId("vocabulary")).toHaveTextContent('{"tags":[],"categories":[],"editable":false}');
  });
  it("keeps the user's imported local vocabulary", () => {
    localStorage.setItem(LOCAL_VOCABULARY_KEY, JSON.stringify({ tags: [{ id: "own-tag", workspaceId: "local", name: "My tag", color: null }], categories: [] }));
    render(<TaxonomyProvider workspaceId={null} ownerId={null}><Probe /></TaxonomyProvider>);
    expect(screen.getByTestId("vocabulary")).toHaveTextContent('"tags":["My tag"]');
  });
});
