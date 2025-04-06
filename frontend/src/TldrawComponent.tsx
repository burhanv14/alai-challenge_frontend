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
  try {
    const normalizedAnchor = { x: 0.5, y: 0.5 };
    const startBounds = editor.getShapePageBounds(startShapeId);
    const endBounds = editor.getShapePageBounds(endShapeId);

    if (!startBounds || !endBounds) return null;

    const startRotation = editor.getShapePageTransform(startShapeId)?.rotation() || 0;
    const endRotation = editor.getShapePageTransform(endShapeId)?.rotation() || 0;

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
  } catch (error) {
    console.error("Error creating arrow between shapes:", error);
    return null;
  }
};

const calculateTextPosition = (angle: number) => {
  try {
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
  } catch (error) {
    console.error("Error calculating text position:", error);
    return { nodeX: 0, nodeY: 0, textX: 0, textY: 0 };
  }
};

const TldrawComponent = () => {
  const [spokeCount, setSpokeCount] = useState(6);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [error, setError] = useState<string | null>(null);
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
    try {
      if (!editor) return null;
      
      editor.user.updateUserPreferences({ colorScheme: "light" });
      
      const currentShapeIds = Array.from(editor.getCurrentPageShapeIds());
      if (currentShapeIds.length > 0) {
        editor.deleteShapes(currentShapeIds);
      }

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

      const validSpokeCount = Math.max(MIN_SPOKES, Math.min(MAX_SPOKES, spokeCount));

      for (let i = 0; i < validSpokeCount; i++) {
        const angle = (i * 2 * Math.PI) / validSpokeCount;
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
      
      try {
        editor.zoomToFit();
      } catch (zoomError) {
        console.error("Error zooming to fit:", zoomError);
      }
      
      return diagramRef.current;
    } catch (error) {
      console.error("Error creating hub and spokes:", error);
      setError("Failed to create diagram. Please try again.");
      return null;
    }
  }, [spokeCount]);

  useEffect(() => {
    if (editor) {
      try {
        createHubAndSpokes(editor);
      } catch (error) {
        console.error("Error in useEffect:", error);
        setError("Failed to update diagram. Please try again.");
      }
    }
  }, [editor, spokeCount, createHubAndSpokes]);

  const handleAddSpoke = useCallback(() => {
    try {
      if (spokeCount < MAX_SPOKES) setSpokeCount(prevCount => prevCount + 1);
    } catch (error) {
      console.error("Error adding spoke:", error);
      setError("Failed to add spoke. Please try again.");
    }
  }, [spokeCount]);

  const handleRemoveSpoke = useCallback(() => {
    try {
      if (spokeCount > MIN_SPOKES) setSpokeCount(prevCount => prevCount - 1);
    } catch (error) {
      console.error("Error removing spoke:", error);
      setError("Failed to remove spoke. Please try again.");
    }
  }, [spokeCount]);

  const handleEditorMount = useCallback((editor: Editor) => {
    try {
      setEditor(editor);
    } catch (error) {
      console.error("Error mounting editor:", error);
      setError("Failed to initialize the editor. Please refresh the page.");
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return (
    <div style={{ fontFamily: "serif" }}>
      {error && (
        <div style={{
          padding: "0.5rem",
          marginBottom: "1rem",
          backgroundColor: "#ffdddd",
          color: "#990000",
          border: "1px solid #990000",
          borderRadius: "4px",
          display: "flex",
          justifyContent: "space-between"
        }}>
          <span>{error}</span>
          <button 
            onClick={clearError}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: "1rem"
            }}
          >
            ✕
          </button>
        </div>
      )}
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