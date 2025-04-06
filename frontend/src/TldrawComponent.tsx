import { Tldraw, createShapeId, Editor, TLShapeId, Vec, toRichText, DefaultColorStyle } from "tldraw";
import "tldraw/tldraw.css";
import { useCallback, useState, useEffect } from "react";
import './index.css'

const HUB_RADIUS = 120;
const SPOKE_LENGTH = 280;
const MIN_SPOKES = 2;
const MAX_SPOKES = 6;
const NODE_RADIUS = 12;
const TEXT_PADDING = 30;

export default function TldrawComponent() {
  const [spokeCount, setSpokeCount] = useState(6);
  const [editor, setEditor] = useState<Editor | null>(null);
  // Store references to shapes for movement tracking
  const [diagramShapes, setDiagramShapes] = useState<{
    hubId: TLShapeId | null;
    nodeIds: TLShapeId[];
    textIds: TLShapeId[];
    arrowIds: TLShapeId[];
  }>({
    hubId: null,
    nodeIds: [],
    textIds: [],
    arrowIds: []
  });

  // Function to create an arrow between two shapes with improved binding
  function createArrowBetweenShapes(
    editor: Editor,
    startShapeId: TLShapeId,
    endShapeId: TLShapeId,
    parentId?: TLShapeId
  ) {
    const startNormalizedAnchor = { x: 0.5, y: 0.5 };
    const endNormalizedAnchor = { x: 0.5, y: 0.5 };

    const startTerminalNormalizedPosition = Vec.From(startNormalizedAnchor);
    const endTerminalNormalizedPosition = Vec.From(endNormalizedAnchor);

    const parent = parentId ? editor.getShape(parentId) : undefined;

    const startShapePageBounds = editor.getShapePageBounds(startShapeId);
    const endShapePageBounds = editor.getShapePageBounds(endShapeId);

    const startShapePageRotation = editor.getShapePageTransform(startShapeId).rotation();
    const endShapePageRotation = editor.getShapePageTransform(endShapeId).rotation();

    if (!startShapePageBounds || !endShapePageBounds) return;

    const startTerminalPagePosition = Vec.Add(
      startShapePageBounds.point,
      Vec.MulV(
        startShapePageBounds.size,
        Vec.Rot(startTerminalNormalizedPosition, startShapePageRotation)
      )
    );
    const endTerminalPagePosition = Vec.Add(
      endShapePageBounds.point,
      Vec.MulV(
        endShapePageBounds.size,
        Vec.Rot(endTerminalNormalizedPosition, endShapePageRotation)
      )
    );

    const arrowPointInParentSpace = Vec.Min(startTerminalPagePosition, endTerminalPagePosition);
    if (parent) {
      arrowPointInParentSpace.setTo(
        editor.getShapePageTransform(parent.id)!.applyToPoint(arrowPointInParentSpace)
      );
    }

    const arrowId = createShapeId();
    editor.run(() => {
      editor.markHistoryStoppingPoint('creating_arrow');
      editor.createShape({
        id: arrowId,
        type: 'arrow',
        x: arrowPointInParentSpace.x,
        y: arrowPointInParentSpace.y,
        props: {
          start: {
            x: startTerminalPagePosition.x - arrowPointInParentSpace.x,
            y: startTerminalPagePosition.y - arrowPointInParentSpace.y,
          },
          end: {
            x: endTerminalPagePosition.x - arrowPointInParentSpace.x,
            y: endTerminalPagePosition.y - arrowPointInParentSpace.y,
          },
          color: 'blue',
          fill: 'solid',
          size: 'l',
        },
      });

      editor.createBindings([
        {
          fromId: arrowId,
          toId: startShapeId,
          type: 'arrow',
          props: {
            terminal: 'start',
            normalizedAnchor: startNormalizedAnchor,
            isExact: false,
            isPrecise: false,
          },
        },
        {
          fromId: arrowId,
          toId: endShapeId,
          type: 'arrow',
          props: {
            terminal: 'end',
            normalizedAnchor: endNormalizedAnchor,
            isExact: false,
            isPrecise: false,
          },
        },
      ]);
    });
    return arrowId;
  }

  // Calculate positions to avoid collisions between text boxes
  const calculateNonCollidingPosition = (
    angle: number,
    index: number,
    totalSpokes: number
  ) => {
    // Base position
    const baseX = Math.cos(angle) * SPOKE_LENGTH;
    const baseY = Math.sin(angle) * SPOKE_LENGTH;
    
    // Adjust text position based on which quadrant it's in
    let textOffsetX, textOffsetY;
    
    // Top
    if (angle > -Math.PI/4 && angle < Math.PI/4) {
      textOffsetY = -80;
      textOffsetX = 0;
    }
    // Right
    else if (angle >= Math.PI/4 && angle < 3*Math.PI/4) {
      textOffsetX = 80;
      textOffsetY = 0;
    }
    // Bottom
    else if ((angle >= 3*Math.PI/4 && angle <= Math.PI) || (angle <= -3*Math.PI/4 && angle >= -Math.PI)) {
      textOffsetY = 80;
      textOffsetX = 0;
    }
    // Left
    else {
      textOffsetX = -80;
      textOffsetY = 0;
    }
    
    return {
      nodeX: baseX,
      nodeY: baseY,
      textX: baseX + textOffsetX,
      textY: baseY + textOffsetY
    };
  };

  // Create hub and spokes with text labels and arrows
  const createHubAndSpokes = useCallback((editor: Editor) => {
    // Set color for next shapes
    editor.setStyleForNextShapes(DefaultColorStyle, 'white');
    
    // Clear existing shapes
    editor.deleteShapes(Array.from(editor.getCurrentPageShapeIds()));

    // Create central hub
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
        size: "l",
        richText: toRichText("HUB"),
      },
    });

    const textString = "Non ullamco Spoke test.";
    
    // Create spokes with text labels and arrows - evenly distributed
    const textIds: TLShapeId[] = [];
    const nodeIds: TLShapeId[] = [];
    const arrowIds: TLShapeId[] = [];

    for (let i = 0; i < spokeCount; i++) {
      const angle = (i * 2 * Math.PI) / spokeCount;
      
      // Calculate positions with collision avoidance
      const { nodeX, nodeY, textX, textY } = calculateNonCollidingPosition(angle, i, spokeCount);
      
      // Create IDs for shapes
      const textId = createShapeId();
      const nodeId = createShapeId();

      textIds.push(textId);
      nodeIds.push(nodeId);

      // Create small node at the end of each spoke
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

      // Create text node with appropriate positioning
      editor.createShape({
        id: textId,
        type: "text",
        x: centerX + textX - 150,
        y: centerY + textY - 30,
        props: {
          w: 300,
          richText: toRichText(textString),
          color: "light-blue",
          font: "serif",
          size: "m",
          textAlign: 'middle',
        },
      });

      // Create arrow connecting hub to node
      const arrowId = createArrowBetweenShapes(editor, hubId, nodeId);
      arrowIds.push(arrowId);
    }

    // Store references to shapes for use in update handlers
    setDiagramShapes({
      hubId,
      nodeIds,
      textIds,
      arrowIds
    });

    // Center the view on the diagram
    editor.zoomToFit();

    return { hubId, textIds, nodeIds, arrowIds };
  }, [spokeCount]);

  // Update the diagram when the spoke count changes
  useEffect(() => {
    if (editor) {
      createHubAndSpokes(editor);
    }
  }, [editor, spokeCount, createHubAndSpokes]);

  // Set up event listener for tracking shape changes
  useEffect(() => {
    if (!editor || !diagramShapes.hubId) return;

    // Previous positions to track movements
    const prevPositions: Record<string, { x: number, y: number }> = {};
    
    // Get initial positions of all shapes
    const initializePositions = () => {
      if (!editor) return;
      
      // Store hub position
      if (diagramShapes.hubId) {
        const hubShape = editor.getShape(diagramShapes.hubId);
        if (hubShape) {
          prevPositions[diagramShapes.hubId] = { x: hubShape.x, y: hubShape.y };
        }
      }
      
      // Store node positions
      diagramShapes.nodeIds.forEach(nodeId => {
        const nodeShape = editor.getShape(nodeId);
        if (nodeShape) {
          prevPositions[nodeId] = { x: nodeShape.x, y: nodeShape.y };
        }
      });
      
      // Store text positions
      diagramShapes.textIds.forEach(textId => {
        const textShape = editor.getShape(textId);
        if (textShape) {
          prevPositions[textId] = { x: textShape.x, y: textShape.y };
        }
      });
    };
    
    // Initialize positions
    initializePositions();
    
    // The main listener for shape changes
    const unsubscribe = editor.store.listen(
      'shape_update',
      ({ shapes }) => {
        // Loop through each updated shape
        shapes.forEach(record => {
          const shape = editor.getShape(record.id);
          if (!shape) return;
          
          // Handle hub movement - move all nodes relative to hub
          if (diagramShapes.hubId && shape.id === diagramShapes.hubId) {
            const hubShape = shape;
            const hubDelta = {
              x: hubShape.x - (prevPositions[hubShape.id]?.x || hubShape.x),
              y: hubShape.y - (prevPositions[hubShape.id]?.y || hubShape.y)
            };
            
            // Skip if no movement
            if (hubDelta.x === 0 && hubDelta.y === 0) return;
            
            // Update previous position
            prevPositions[hubShape.id] = { x: hubShape.x, y: hubShape.y };
            
            // Move all nodes and texts
            diagramShapes.nodeIds.forEach((nodeId, index) => {
              const nodeShape = editor.getShape(nodeId);
              const textId = diagramShapes.textIds[index];
              const textShape = editor.getShape(textId);
              
              if (nodeShape) {
                const newNodeX = nodeShape.x + hubDelta.x;
                const newNodeY = nodeShape.y + hubDelta.y;
                
                editor.updateShape({
                  id: nodeId,
                  x: newNodeX,
                  y: newNodeY
                });
                
                prevPositions[nodeId] = { x: newNodeX, y: newNodeY };
              }
              
              if (textShape) {
                const newTextX = textShape.x + hubDelta.x;
                const newTextY = textShape.y + hubDelta.y;
                
                editor.updateShape({
                  id: textId,
                  x: newTextX,
                  y: newTextY
                });
                
                prevPositions[textId] = { x: newTextX, y: newTextY };
              }
            });
            
            return;
          }
          
          // Handle text movement - move associated node and check for collisions
          const textIndex = diagramShapes.textIds.indexOf(shape.id);
          if (textIndex !== -1) {
            const textShape = shape;
            const nodeId = diagramShapes.nodeIds[textIndex];
            const nodeShape = editor.getShape(nodeId);
            const hubShape = diagramShapes.hubId ? editor.getShape(diagramShapes.hubId) : null;
            
            // Update previous position
            const textDelta = {
              x: textShape.x - (prevPositions[textShape.id]?.x || textShape.x),
              y: textShape.y - (prevPositions[textShape.id]?.y || textShape.y)
            };
            
            prevPositions[textShape.id] = { x: textShape.x, y: textShape.y };
            
            // Skip if no movement
            if (textDelta.x === 0 && textDelta.y === 0) return;
            
            // Check for collisions with other text boxes
            preventCollisions(editor, textShape.id, diagramShapes.textIds);
            
            // Update node position if hub and node exist
            if (nodeShape && hubShape) {
              // Get the centers
              const hubCenter = {
                x: hubShape.x + HUB_RADIUS,
                y: hubShape.y + HUB_RADIUS
              };
              
              const textCenter = {
                x: textShape.x + (textShape.props?.w ? textShape.props.w / 2 : 150),
                y: textShape.y + 30 // approximate center
              };
              
              // Calculate direction vector from hub to text
              const dirVec = new Vec(
                textCenter.x - hubCenter.x,
                textCenter.y - hubCenter.y
              ).uni();
              
              // Position node along this vector at SPOKE_LENGTH distance
              const newNodePos = Vec.Add(
                new Vec(hubCenter.x, hubCenter.y),
                Vec.Mul(dirVec, SPOKE_LENGTH)
              );
              
              // Update node position
              editor.updateShape({
                id: nodeId,
                x: newNodePos.x - NODE_RADIUS,
                y: newNodePos.y - NODE_RADIUS
              });
              
              prevPositions[nodeId] = { 
                x: newNodePos.x - NODE_RADIUS, 
                y: newNodePos.y - NODE_RADIUS 
              };
              
              // Update arrow if needed (arrows adjust automatically through bindings)
            }
          }
          
          // Handle node movement (usually triggered by text movement)
          const nodeIndex = diagramShapes.nodeIds.indexOf(shape.id);
          if (nodeIndex !== -1) {
            // Just update previous position
            prevPositions[shape.id] = { x: shape.x, y: shape.y };
          }
        });
      }
    );
    
    // Clean up listener on unmount
    return () => {
      unsubscribe();
    };
  }, [editor, diagramShapes]);

  // Function to prevent collisions between text boxes
  const preventCollisions = (
    editor: Editor, 
    movedTextId: TLShapeId, 
    allTextIds: TLShapeId[]
  ) => {
    const movedShape = editor.getShape(movedTextId);
    if (!movedShape || !movedShape.props?.w) return;
    
    // Get bounds for moved text
    const movedBounds = {
      x: movedShape.x,
      y: movedShape.y,
      width: movedShape.props.w as number,
      height: 60, // Approximate text height
    };
    
    // Check against all other text boxes
    for (const textId of allTextIds) {
      if (textId === movedTextId) continue;
      
      const otherShape = editor.getShape(textId);
      if (!otherShape || !otherShape.props?.w) continue;
      
      const otherBounds = {
        x: otherShape.x,
        y: otherShape.y,
        width: otherShape.props.w as number,
        height: 60, // Approximate text height
      };
      
      // Check for collision
      if (
        movedBounds.x < otherBounds.x + otherBounds.width + TEXT_PADDING &&
        movedBounds.x + movedBounds.width + TEXT_PADDING > otherBounds.x &&
        movedBounds.y < otherBounds.y + otherBounds.height + TEXT_PADDING &&
        movedBounds.y + movedBounds.height + TEXT_PADDING > otherBounds.y
      ) {
        // Calculate overlap in x and y directions
        const overlapX = Math.min(
          movedBounds.x + movedBounds.width + TEXT_PADDING - otherBounds.x,
          otherBounds.x + otherBounds.width + TEXT_PADDING - movedBounds.x
        );
        
        const overlapY = Math.min(
          movedBounds.y + movedBounds.height + TEXT_PADDING - otherBounds.y,
          otherBounds.y + otherBounds.height + TEXT_PADDING - movedBounds.y
        );
        
        // Move in direction of least overlap
        if (overlapX < overlapY) {
          // Horizontal adjustment
          const moveDir = movedBounds.x < otherBounds.x ? -1 : 1;
          const moveAmount = overlapX * moveDir;
          
          editor.updateShape({
            id: otherShape.id,
            x: otherShape.x + moveAmount
          });
        } else {
          // Vertical adjustment
          const moveDir = movedBounds.y < otherBounds.y ? -1 : 1;
          const moveAmount = overlapY * moveDir;
          
          editor.updateShape({
            id: otherShape.id,
            y: otherShape.y + moveAmount
          });
        }
      }
    }
  };

  const handleAddSpoke = useCallback(() => {
    if (spokeCount < MAX_SPOKES) {
      setSpokeCount((prev) => prev + 1);
    }
  }, [spokeCount]);

  const handleRemoveSpoke = useCallback(() => {
    if (spokeCount > MIN_SPOKES) {
      setSpokeCount((prev) => prev - 1);
    }
  }, [spokeCount]);

  const handleEditorMount = useCallback((editor: Editor) => {
    setEditor(editor);
    createHubAndSpokes(editor);
  }, [createHubAndSpokes]);

  return (
    <div style={{ fontFamily: "serif" }} >
      {/* className="tldraw-container" */}
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
            fontFamily: "serif",
            cursor: spokeCount >= MAX_SPOKES ? "not-allowed" : "pointer"
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
            fontFamily: "serif",
            cursor: spokeCount <= MIN_SPOKES ? "not-allowed" : "pointer"
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
          backgroundColor: "#f5f0e5" 
        }}
      >
        <Tldraw hideUi={true} onMount={handleEditorMount} />
      </div>
    </div>
  );
}