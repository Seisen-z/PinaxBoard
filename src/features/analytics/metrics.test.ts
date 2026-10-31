import { describe, expect, it } from "vitest";
import { productivityMetrics } from "@/features/analytics/metrics";
import { createBlankNote } from "@/features/notes/create-note";
const note=(days:number)=>{const value=createBlankNote({boardId:"board",ownerId:"owner",laneId:"lane"});value.completed=true;value.completedAt=new Date(2026,9,30-days).toISOString();return value;};
describe("productivity metrics",()=>{it("uses completion events instead of updated dates",()=>{const open=createBlankNote({boardId:"board",ownerId:"owner",laneId:"lane"});expect(productivityMetrics([note(0),note(1),open],new Date(2026,9,30))).toMatchObject({completedToday:1,completedWeek:2,completedMonth:2,currentStreak:2,activeNotes:1});});});

it("ignores future, invalid and trashed completion events",()=>{const future=note(-2),bad=note(0),deleted=note(0);bad.completedAt="invalid";deleted.deletedAt="2026-10-30T00:00:00Z";expect(productivityMetrics([future,bad,deleted],new Date(2026,9,30)).completedMonth).toBe(0);});
it("counts yesterday as an ongoing streak and resolves category activity",()=>{const first=note(1);first.categoryId="cat";const result=productivityMetrics([first,note(2)],new Date(2026,9,30),[{id:"cat",workspaceId:"w",name:"Work",color:null,icon:null,emoji:null}]);expect(result.currentStreak).toBe(2);expect(result.mostActiveCategory).toBe("Work");expect(result.days).toHaveLength(14);});
