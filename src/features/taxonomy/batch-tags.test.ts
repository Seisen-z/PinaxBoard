import { beforeEach, describe, expect, it, vi } from "vitest";
const calls=vi.hoisted(()=>({clear:vi.fn(async()=>({error:null})),insert:vi.fn(async(values:unknown[])=>({error:null,count:values.length}))}));
vi.mock("@/lib/supabase/client",()=>({getSupabaseBrowserClient:()=>({from:()=>({delete:()=>({in:calls.clear}),insert:calls.insert})})}));
import { setNoteTagsBatch } from "./repository";
describe("bulk tag synchronization",()=>{beforeEach(()=>vi.clearAllMocks());it("uses bounded batches rather than per-note requests",async()=>{await setNoteTagsBatch(Array.from({length:201},(_,index)=>({id:`n${index}`,tagIds:["tag","tag"]})));expect(calls.clear).toHaveBeenCalledTimes(3);expect(calls.insert).toHaveBeenCalledTimes(3);expect(calls.insert.mock.calls[0]?.[0]).toHaveLength(100);});it("does nothing for unchanged tag lists",async()=>{await setNoteTagsBatch([]);expect(calls.clear).not.toHaveBeenCalled();expect(calls.insert).not.toHaveBeenCalled();});});
