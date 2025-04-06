import { Tldraw, createShapeId, Editor, TLShapeId, Vec, toRichText } from "tldraw";
import "tldraw/tldraw.css";
import { useCallback, useState, useEffect, useRef } from "react";
import './index.css';

const HUB_RADIUS = 130;
const SPOKE_LENGTH = 280;
const MIN_SPOKES = 2;
const MAX_SPOKES = 6;
const NODE_RADIUS = 12;

// Function to create an arrow between two shapes
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

// Improved function to calculate optimal positions for text based on angle
// Improved function to calculate optimal positions for text based on angle
const calculateTextPosition = (angle: number) => {
  const nodeX = Math.cos(angle) * SPOKE_LENGTH;
  const nodeY = Math.sin(angle) * SPOKE_LENGTH;
  
  // Always position text in the direction of the spoke, with adjustments for visual alignment
  const textDistance = 60; // Distance from the node to the text
  let textX = nodeX + Math.cos(angle) * textDistance;
  let textY = nodeY + Math.sin(angle) * textDistance;

  // Special adjustments for certain angles to ensure text is correctly placed for spoke no.1 and spoke no.4
  if (angle >= 0 && angle < Math.PI / 3) { // First quadrant (Spoke No.1)
    textX += 35; // Adjust rightwards for better placement
  } else if (angle >= Math.PI && angle < 4 * Math.PI / 3) { // Second quadrant (Spoke No.4)
    textX -= 20; // Adjust leftwards for better placement
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
    baseAngles: number[]; // Store the initial angles of spokes
    centerX: number;
    centerY: number;
  }>({
    hubId: null,
    nodeIds: [],
    textIds: [],
    arrowIds: [],
    baseAngles: [],
    centerX: 600,
    centerY: 400
  });

  // Function to create the hub and spokes with text labels and arrows
  const createHubAndSpokes = useCallback((editor: Editor) => {
    editor.user.updateUserPreferences({ colorScheme: "light" });
    editor.deleteShapes(Array.from(editor.getCurrentPageShapeIds()));

    const hubId = createShapeId();
    const centerX = 600;
    const centerY = 400;

    editor.createShape({
      id: hubId,
      type: "geo",
      x: centerX - HUB_RADIUS,
      y: centerY - HUB_RADIUS,
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
    const baseAngles: number[] = [];

    for (let i = 0; i < spokeCount; i++) {
      const angle = (i * 2 * Math.PI) / spokeCount;
      baseAngles.push(angle);
      const { nodeX, nodeY, textX, textY } = calculateTextPosition(angle);
      const textId = createShapeId();
      const nodeId = createShapeId();

      textIds.push(textId);
      nodeIds.push(nodeId);

      editor.createShape({
        id: nodeId,
        type: "geo",
        x: centerX + nodeX - NODE_RADIUS,
        y: centerY + nodeY - NODE_RADIUS,
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
        x: centerX + textX - 80, // Center the text better
        y: centerY + textY - 20, // Adjust vertical position
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
      if (arrowId) arrowIds.push(arrowId);
    }

    diagramRef.current = {
      hubId,
      nodeIds,
      textIds,
      arrowIds,
      baseAngles,
      centerX,
      centerY
    };
    
    editor.zoomToFit();
    return diagramRef.current;
  }, [spokeCount]);

  // Function to calculate angular difference between two positions
  const calculateAngleDifference = (oldPos: { x: number, y: number }, newPos: { x: number, y: number }, center: { x: number, y: number }) => {
    const oldAngle = Math.atan2(oldPos.y - center.y, oldPos.x - center.x);
    const newAngle = Math.atan2(newPos.y - center.y, newPos.x - center.x);
    return newAngle - oldAngle;
  };

  // Function to rotate all elements
  const rotateAllElements = (editor: Editor, angleDiff: number) => {
    const { hubId, nodeIds, textIds, baseAngles, centerX, centerY } = diagramRef.current;
    
    // Update base angles with rotation
    const newBaseAngles = baseAngles.map(angle => angle + angleDiff);
    diagramRef.current.baseAngles = newBaseAngles;
    
    // Update positions of all nodes and texts based on new angles
    for (let i = 0; i < nodeIds.length; i++) {
      const newAngle = newBaseAngles[i];
      const { nodeX, nodeY, textX, textY } = calculateTextPosition(newAngle);
      
      // Update node position
      editor.updateShape({
        id: nodeIds[i],
        type: "geo",
        x: centerX + nodeX - NODE_RADIUS,
        y: centerY + nodeY - NODE_RADIUS,
      });
      
      // Update text position
      editor.updateShape({
        id: textIds[i],
        type: "text",
        x: centerX + textX - 75,
        y: centerY + textY - 20,
      });
    }
    
    // Recreate arrows to ensure they connect properly
    const { arrowIds } = diagramRef.current;
    if (arrowIds.length > 0) {
      editor.deleteShapes(arrowIds);
    }
    
    const newArrowIds: TLShapeId[] = [];
    for (const nodeId of nodeIds) {
      const arrowId = createArrowBetweenShapes(editor, hubId!, nodeId);
      if (arrowId) newArrowIds.push(arrowId);
    }
    
    diagramRef.current.arrowIds = newArrowIds;
  };

  useEffect(() => {
    if (editor) {
      createHubAndSpokes(editor);
    }
  }, [editor, spokeCount, createHubAndSpokes]);

  useEffect(() => {
    if (!editor) return;

    // Track node positions for rotation detection
    const nodePositions = new Map<TLShapeId, { x: number, y: number }>();
    
    // Initialize node positions
    const { nodeIds } = diagramRef.current;
    nodeIds.forEach(id => {
      const bounds = editor.getShapePageBounds(id);
      if (bounds) {
        nodePositions.set(id, { 
          x: bounds.x + bounds.width / 2, 
          y: bounds.y + bounds.height / 2 
        });
      }
    });

    // Listen for shape updates
    const unsubscribe = editor.store.listen("shape_update", ({ shapes }) => {
      // Check if any of our nodes was moved
      const { nodeIds, centerX, centerY } = diagramRef.current;
      const center = { x: centerX, y: centerY };
      
      for (const shape of shapes) {
        if (nodeIds.includes(shape.id)) {
          const oldPos = nodePositions.get(shape.id);
          const newBounds = editor.getShapePageBounds(shape.id);
          
          if (oldPos && newBounds) {
            const newPos = { 
              x: newBounds.x + newBounds.width / 2, 
              y: newBounds.y + newBounds.height / 2 
            };
            
            // Calculate rotation angle
            const angleDiff = calculateAngleDifference(oldPos, newPos, center);
            
            // Rotate everything
            rotateAllElements(editor, angleDiff);
            
            // Update all tracked positions after rotation
            nodeIds.forEach(id => {
              const bounds = editor.getShapePageBounds(id);
              if (bounds) {
                nodePositions.set(id, { 
                  x: bounds.x + bounds.width / 2, 
                  y: bounds.y + bounds.height / 2 
                });
              }
            });
            
            break; // Only handle one node movement at a time
          }
        }
      }
    });

    return () => {
      unsubscribe?.();
    };
  }, [editor]);

  const handleAddSpoke = useCallback(() => {
    if (spokeCount < MAX_SPOKES) setSpokeCount(spokeCount + 1);
  }, [spokeCount]);

  const handleRemoveSpoke = useCallback(() => {
    if (spokeCount > MIN_SPOKES) setSpokeCount(spokeCount - 1);
  }, [spokeCount]);

  const handleEditorMount = useCallback((editor: Editor) => {
    setEditor(editor);
    createHubAndSpokes(editor);
  }, [createHubAndSpokes]);

  return (
    <div style={{ fontFamily: "serif" }}>
      <div style={{ marginBottom: "1rem" }}>
        <button
          onClick={handleAddSpoke}
          disabled={spokeCount >= MAX_SPOKES}
          style={{
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