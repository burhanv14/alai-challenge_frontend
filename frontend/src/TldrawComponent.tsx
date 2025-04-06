import { Tldraw, createShapeId, Editor, TLShapeId, Vec, toRichText } from "tldraw";
import "tldraw/tldraw.css";
import { useCallback, useState, useEffect, useRef } from "react";
import './index.css';

const HUB_RADIUS = 130;
const SPOKE_LENGTH = 280;
const MIN_SPOKES = 2;
const MAX_SPOKES = 6;
const NODE_RADIUS = 12;

const createArrowBetweenShapes = (editor: Editor, startShapeId: TLShapeId, endShapeId: TLShapeId) => {
  const normalizedAnchor = { x: 0.5, y: 0.5 };
  const startBounds = editor.getShapePageBounds(startShapeId);
  const endBounds = editor.getShapePageBounds(endShapeId);

  if (!startBounds || !endBounds) return null;

  const startRotation = editor.getShapePageTransform(startShapeId).rotation();
  const endRotation = editor.getShapePageTransform(endShapeId).rotation();

  const startPos = Vec.Add(
    startBounds.point,
    Vec.MulV(startBounds.size, Vec.Rot(Vec.From(normalizedAnchor), startRotation))
  );
  const endPos = Vec.Add(
    endBounds.point,
    Vec.MulV(endBounds.size, Vec.Rot(Vec.From(normalizedAnchor), endRotation))
  );

  const arrowId = createShapeId();
  editor.run(() => {
    editor.createShape({
      id: arrowId,
      type: "arrow",
      x: Math.min(startPos.x, endPos.x),
      y: Math.min(startPos.y, endPos.y),
      props: {
        start: { x: startPos.x - Math.min(startPos.x, endPos.x), y: startPos.y - Math.min(startPos.y, endPos.y) },
        end: { x: endPos.x - Math.min(startPos.x, endPos.x), y: endPos.y - Math.min(startPos.y, endPos.y) },
        color: "blue",
        fill: "solid",
        size: "l",
      },
    });

    editor.createBindings([
      { fromId: arrowId, toId: startShapeId, type: "arrow", props: { terminal: "start", normalizedAnchor, isExact: false, isPrecise: false } },
      { fromId: arrowId, toId: endShapeId, type: "arrow", props: { terminal: "end", normalizedAnchor, isExact: false, isPrecise: false } },
    ]);
  });

  return arrowId;
};

const calculateTextPosition = (angle: number) => {
  const nodeX = Math.cos(angle) * SPOKE_LENGTH;
  const nodeY = Math.sin(angle) * SPOKE_LENGTH;
  
  const textDistance = 60;
  let textX = nodeX + Math.cos(angle) * textDistance;
  let textY = nodeY + Math.sin(angle) * textDistance;

  if (angle >= 0 && angle < Math.PI / 3) {
    textX += 35;
  } else if (angle >= Math.PI && angle < 4 * Math.PI / 3) {
    textX -= 20;
  } 

  return { nodeX, nodeY, textX, textY };
};

const TldrawComponent = () => {
  const [spokeCount, setSpokeCount] = useState(6);
  const [editor, setEditor] = useState<Editor | null>(null);
  const diagramRef = useRef<{
    hubId: TLShapeId | null;
    nodeIds: TLShapeId[];
    textIds: TLShapeId[];
    arrowIds: TLShapeId[];
    spokeGroupIds: TLShapeId[];
    parentGroupId: TLShapeId | null;
    centerX: number;
    centerY: number;
  }>({
    hubId: null,
    nodeIds: [],
    textIds: [],
    arrowIds: [],
    spokeGroupIds: [],
    parentGroupId: null,
    centerX: 600,
    centerY: 400
  });

  const createHubAndSpokes = useCallback((editor: Editor) => {
    editor.user.updateUserPreferences({ colorScheme: "light" });
    editor.deleteShapes(Array.from(editor.getCurrentPageShapeIds()));

    const parentGroupId = createShapeId();
    const hubId = createShapeId();
    const centerX = 600;
    const centerY = 400;

    editor.createShape({
      id: parentGroupId,
      type: "group",
      x: 0,
      y: 0,
      props: {}
    });

    editor.createShape({
      id: hubId,
      type: "geo",
      x: centerX - HUB_RADIUS,
      y: centerY - HUB_RADIUS,
      parentId: parentGroupId,
      props: {
        geo: "ellipse",
        w: HUB_RADIUS * 2,
        h: HUB_RADIUS * 2,
        fill: "solid",
        color: "blue",
        size: "xl",
        richText: toRichText("HUB"),
      },
    });

    const textString = "Spoke No: ";
    const textIds: TLShapeId[] = [];
    const nodeIds: TLShapeId[] = [];
    const arrowIds: TLShapeId[] = [];
    const spokeGroupIds: TLShapeId[] = [];

    for (let i = 0; i < spokeCount; i++) {
      const angle = (i * 2 * Math.PI) / spokeCount;
      const { nodeX, nodeY, textX, textY } = calculateTextPosition(angle);
      const textId = createShapeId();
      const nodeId = createShapeId();

      textIds.push(textId);
      nodeIds.push(nodeId);

      const spokeGroupId = createShapeId();
      spokeGroupIds.push(spokeGroupId);
      editor.createShape({
        id: spokeGroupId,
        type: "group",
        x: 0,
        y: 0,
        parentId: parentGroupId,
        props: {}
      });

      editor.createShape({
        id: nodeId,
        type: "geo",
        x: centerX + nodeX - NODE_RADIUS,
        y: centerY + nodeY - NODE_RADIUS,
        parentId: spokeGroupId,
        props: {
          geo: "ellipse",
          w: NODE_RADIUS * 2,
          h: NODE_RADIUS * 2,
          fill: "solid",
          color: "blue",
          size: "s",
        },
      });

      editor.createShape({
        id: textId,
        type: "text",
        x: centerX + textX - 80,
        y: centerY + textY - 20,
        parentId: spokeGroupId,
        props: {
          w: 150,
          richText: toRichText(`${textString} ${i + 1}`),
          color: "light-blue",
          font: "serif",
          size: "m",
          textAlign: "middle",
        },
      });

      const arrowId = createArrowBetweenShapes(editor, hubId, nodeId);
      if (arrowId) {
        arrowIds.push(arrowId);
        editor.updateShape({
          id: arrowId,
          type: "arrow",
          parentId: parentGroupId,
        });
      }
    }

    diagramRef.current = {
      hubId,
      nodeIds,
      textIds,
      arrowIds,
      spokeGroupIds,
      parentGroupId,
      centerX,
      centerY
    };
    
    editor.zoomToFit();
    return diagramRef.current;
  }, [spokeCount]);

  useEffect(() => {
    if (editor) {
      createHubAndSpokes(editor);
    }
  }, [editor, spokeCount, createHubAndSpokes]);

  const handleAddSpoke = useCallback(() => {
    if (spokeCount < MAX_SPOKES) setSpokeCount(spokeCount + 1);
  }, [spokeCount]);

  const handleRemoveSpoke = useCallback(() => {
    if (spokeCount > MIN_SPOKES) setSpokeCount(spokeCount - 1);
  }, [spokeCount]);

  const handleEditorMount = useCallback((editor: Editor) => {
    setEditor(editor);
  }, []);

  return (
    <div style={{ fontFamily: "serif" }}>
      <div style={{ marginBottom: "1rem" }}>
        <button
          onClick={handleAddSpoke}
          disabled={spokeCount >= MAX_SPOKES}
          style={{
            marginLeft: "1rem",
            marginRight: "1rem",
            padding: "0.5rem 1rem",
            background: spokeCount >= MAX_SPOKES ? "#ccc" : "#0c575f",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: spokeCount >= MAX_SPOKES ? "not-allowed" : "pointer",
          }}
        >
          ➕ Add Spoke ({spokeCount}/{MAX_SPOKES})
        </button>
        <button
          onClick={handleRemoveSpoke}
          disabled={spokeCount <= MIN_SPOKES}
          style={{
            padding: "0.5rem 1rem",
            background: spokeCount <= MIN_SPOKES ? "#ccc" : "#0c575f",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: spokeCount <= MIN_SPOKES ? "not-allowed" : "pointer",
          }}
        >
          ➖ Remove Spoke ({spokeCount}/{MIN_SPOKES})
        </button>
      </div>
      <div
        style={{
          width: "100%",
          height: "600px",
          border: "1px solid #ccc",
          borderRadius: "4px",
          overflow: "hidden",
          backgroundColor: "#f5f0e5",
        }}
      >
        <Tldraw hideUi={true} onMount={handleEditorMount} />
      </div>
    </div>
  );
};

export default TldrawComponent;