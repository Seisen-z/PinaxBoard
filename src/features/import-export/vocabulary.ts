import { z } from "zod";
import { createId } from "@/lib/utils";
import type { Category, Tag } from "@/types/note";
import type { ImportDraft } from "./format";
import { createTag, createCategory, fetchTags, fetchCategories } from "@/features/taxonomy/repository";
export interface Vocabulary { tags: readonly Tag[]; categories: readonly Category[]; }
const tagSchema=z.object({id:z.string(),workspaceId:z.string(),name:z.string().min(1).max(120),color:z.string().nullable()});
const categorySchema=tagSchema.extend({icon:z.string().nullable(),emoji:z.string().nullable()});
export function parseVocabulary(value:unknown):Vocabulary {
 const record=value as {tags?:unknown;categories?:unknown}|null;
 return {tags:record?.tags===undefined?[]:z.array(tagSchema).max(1000).parse(record.tags),categories:record?.categories===undefined?[]:z.array(categorySchema).max(1000).parse(record.categories)};
}
export async function remapVocabulary(draft:ImportDraft,source:Vocabulary,target:Vocabulary,cloud:{workspaceId:string;ownerId:string}|null):Promise<{draft:ImportDraft;vocabulary:Vocabulary}> {
 const tags=cloud?await fetchTags(cloud.workspaceId):[...target.tags],categories=cloud?await fetchCategories(cloud.workspaceId):[...target.categories];
 const tagMap=new Map<string,string>(),categoryMap=new Map<string,string>();
 for(const id of new Set(draft.notes.flatMap((note)=>note.tagIds))){const original=source.tags.find((tag)=>tag.id===id);const found=tags.find((tag)=>tag.id===id||original&&tag.name.toLocaleLowerCase()===original.name.toLocaleLowerCase());if(found){tagMap.set(id,found.id);continue;}if(!original)throw Error("Backup references a missing tag definition. Export a complete backup and retry.");const tag=cloud?await createTag({...cloud,name:original.name,color:original.color}):{...original,id:createId(),workspaceId:"local"};tags.push(tag);tagMap.set(id,tag.id);}
 for(const id of new Set(draft.notes.flatMap((note)=>note.categoryId?[note.categoryId]:[]))){const original=source.categories.find((category)=>category.id===id);const found=categories.find((category)=>category.id===id||original&&category.name.toLocaleLowerCase()===original.name.toLocaleLowerCase());if(found){categoryMap.set(id,found.id);continue;}if(!original)throw Error("Backup references a missing category definition. Export a complete backup and retry.");const category=cloud?await createCategory({...cloud,name:original.name,color:original.color,emoji:original.emoji}):{...original,id:createId(),workspaceId:"local"};categories.push(category);categoryMap.set(id,category.id);}
 return{draft:{...draft,notes:draft.notes.map((note)=>({...note,tagIds:note.tagIds.map((id)=>tagMap.get(id)!),categoryId:note.categoryId?categoryMap.get(note.categoryId)??null:null}))},vocabulary:{tags,categories}};
}
export const LOCAL_VOCABULARY_KEY="tackly:imported-vocabulary";
export function writeLocalVocabulary(vocabulary:Vocabulary){localStorage.setItem(LOCAL_VOCABULARY_KEY,JSON.stringify(vocabulary));window.dispatchEvent(new Event("tackly:vocabulary"));}
