import { Tldraw, createShapeId, Editor, TLShapeId, Vec, toRichText } from "tldraw";
import { getPointerInfo } from "tldraw";
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
  const [globalRotation, setGlobalRotation] = useState(0); // Track global rotation
  const diagramRef = useRef<{
    hubId: TLShapeId | null;
    nodeIds: TLShapeId[];
    textIds: TLShapeId[];
    arrowIds: TLShapeId[];
    groupIds: TLShapeId[]; // Store group IDs
    baseAngles: number[]; // Store the initial angles of spokes
    centerX: number;
    centerY: number;
    lastDragPosition: { x: number, y: number } | null;
  }>({
    hubId: null,
    nodeIds: [],
    textIds: [],
    arrowIds: [],
    groupIds: [],
    baseAngles: [],
    centerX: 600,
    centerY: 400,
    lastDragPosition: null
  });

  // Function to create the hub and spokes with text labels and arrows
  const createHubAndSpokes = useCallback((editor: Editor) => {
    editor.user.updateUserPreferences({ colorScheme: "light" });
    editor.deleteShapes(Array.from(editor.getCurrentPageShapeIds()));

    const hubId = createShapeId();
    const centerX = 600;
    const centerY = 400;

    // Create hub with initial rotation
    editor.createShape({
      id: hubId,
      type: "geo",
      x: centerX - HUB_RADIUS,
      y: centerY - HUB_RADIUS,
      rotation: globalRotation,
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
    const groupIds: TLShapeId[] = [];
    const baseAngles: number[] = [];

    for (let i = 0; i < spokeCount; i++) {
      // Add global rotation to base angles
      const angle = (i * 2 * Math.PI) / spokeCount + globalRotation;
      baseAngles.push(angle);
      const { nodeX, nodeY, textX, textY } = calculateTextPosition(angle);
      const textId = createShapeId();
      const nodeId = createShapeId();
      const groupId = createShapeId();

      textIds.push(textId);
      nodeIds.push(nodeId);
      groupIds.push(groupId);

      // First create the group
      editor.createShape({
        id: groupId,
        type: "group",
        x: 0,
        y: 0,
        props: {}
      });

      // Create node (small ellipse)
      editor.createShape({
        id: nodeId,
        type: "geo",
        x: centerX + nodeX - NODE_RADIUS,
        y: centerY + nodeY - NODE_RADIUS,
        parentId: groupId, // Set parent directly
        props: {
          geo: "ellipse",
          w: NODE_RADIUS * 2,
          h: NODE_RADIUS * 2,
          fill: "solid",
          color: "blue",
          size: "s",
        },
      });

      // Create text
      editor.createShape({
        id: textId,
        type: "text",
        x: centerX + textX - 80, // Center the text better
        y: centerY + textY - 20, // Adjust vertical position
        parentId: groupId, // Set parent directly
        props: {
          w: 150,
          richText: toRichText(`${textString} ${i + 1}`),
          color: "light-blue",
          font: "serif",
          size: "m",
          textAlign: "middle",
        },
      });

      // Create arrow from hub to node
      const arrowId = createArrowBetweenShapes(editor, hubId, nodeId);
      if (arrowId) arrowIds.push(arrowId);
    }

    diagramRef.current = {
      hubId,
      nodeIds,
      textIds,
      arrowIds,
      groupIds,
      baseAngles,
      centerX,
      centerY,
      lastDragPosition: null
    };
    
    editor.zoomToFit();
    return diagramRef.current;
  }, [spokeCount, globalRotation]);

  // Calculate angle from center
  const calculateAngleFromCenter = (point: { x: number, y: number }, center: { x: number, y: number }) => {
    return Math.atan2(point.y - center.y, point.x - center.x);
  };

  // Function to rotate all elements including the hub
  const rotateAllElements = (editor: Editor, newRotation: number) => {
    const { hubId, nodeIds, textIds, centerX, centerY } = diagramRef.current;
    const rotationDiff = newRotation - globalRotation;
    
    // Update global rotation
    setGlobalRotation(rotationDiff);
    
    // Rotate hub
    if (hubId) {
      editor.updateShape({
        id: hubId,
        type: "geo",
        rotation: globalRotation,
      });
    }
    
    // Calculate new positions for all nodes and texts
    for (let i = 0; i < nodeIds.length; i++) {
      // Calculate base angle and add global rotation
      const baseAngle = (i * 2 * Math.PI) / spokeCount;
      const newAngle = baseAngle + globalRotation;
      
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
        x: centerX + textX - 80,
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
  }, [editor, spokeCount, createHubAndSpokes, globalRotation]);

  useEffect(() => {
    if (!editor) return;

    // Handle pointer down to start drag
    const handlePointerDown = (e: any) => {
      const { centerX, centerY } = diagramRef.current;
      const center = { x: centerX, y: centerY };
      
      // Determine if we clicked on any of our shape IDs
      const hitShape = editor.getShapeAtPoint(e.point);
      
      if (hitShape) {
        const { nodeIds, textIds } = diagramRef.current;
        const isPartOfOurDiagram = 
          (hitShape.id === diagramRef.current.hubId) || 
          nodeIds.includes(hitShape.id) || 
          textIds.includes(hitShape.id);
          
        if (isPartOfOurDiagram) {
          // Save initial drag position
          diagramRef.current.lastDragPosition = {
            x: e.point.x,
            y: e.point.y
          };
          
          // Prevent default dragging behavior
          e.preventDefault();
        }
      }
    };
    
    // Handle pointer move for rotation
    const handlePointerMove = (e: any) => {
      const { lastDragPosition, centerX, centerY } = diagramRef.current;
      
      if (lastDragPosition) {
        const center = { x: centerX, y: centerY };
        
        // Calculate initial angle from center
        const initialAngle = calculateAngleFromCenter(lastDragPosition, center);
        
        // Calculate new angle from center
        const newAngle = calculateAngleFromCenter({ x: e.point.x, y: e.point.y }, center);
        
        // Calculate angle difference
        const angleDiff = newAngle - initialAngle;
        
        // Update global rotation (ship's helm behavior)
        const newRotation = globalRotation + angleDiff;
        
        // Rotate all elements
        rotateAllElements(editor, newRotation);
        
        // Update last drag position
        diagramRef.current.lastDragPosition = {
          x: e.point.x,
          y: e.point.y
        };
      }
    };
    
    // Handle pointer up to end drag
    const handlePointerUp = () => {
      diagramRef.current.lastDragPosition = null;
    };

    // Add event listeners
    editor.addListener("pointer_down", handlePointerDown);
    editor.addListener("pointer_move", handlePointerMove);
    editor.addListener("pointer_up", handlePointerUp);
    
    // Clean up
    return () => {
      editor.removeListener("pointer_down", handlePointerDown);
      editor.removeListener("pointer_move", handlePointerMove);
      editor.removeListener("pointer_up", handlePointerUp);
    };
  }, [editor, globalRotation]);

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
        <div style={{ marginTop: "0.5rem", fontStyle: "italic" }}>
          Click and drag any spoke or the hub to rotate the entire structure like a ship's helm.
        </div>
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