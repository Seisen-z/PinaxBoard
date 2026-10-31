import { useRef } from "react";
import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@/test/render";
import { useCanvasTouch } from "./use-canvas-touch";
import { useCanvasStore } from "@/stores/canvas-store";
function Fixture(){const surface=useRef<HTMLDivElement>(null),content=useRef<HTMLDivElement>(null);useCanvasTouch(surface,content);return <div ref={surface} data-testid="touch"><div ref={content}/></div>;}
describe("touch viewport",()=>{it("commits a pinch/pan only on gesture end",()=>{useCanvasStore.getState().setViewport({x:0,y:0,zoom:1});render(<Fixture/>);const target=screen.getByTestId("touch");fireEvent.touchStart(target,{touches:[{clientX:10,clientY:10},{clientX:110,clientY:10}]});fireEvent.touchMove(target,{touches:[{clientX:10,clientY:30},{clientX:210,clientY:30}]});expect(useCanvasStore.getState().viewport.zoom).toBe(1);fireEvent.touchEnd(target,{touches:[]});expect(useCanvasStore.getState().viewport.zoom).toBe(2);expect(useCanvasStore.getState().viewport.y).toBe(10);});});
