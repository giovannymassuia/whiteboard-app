import React, { useMemo, useRef, useState } from "react";
import { Feather } from "@expo/vector-icons";
import {
  View,
  StyleSheet,
  PanResponder,
  LayoutChangeEvent,
  TouchableOpacity,
  Text,
  Animated,
  GestureResponderEvent,
  Dimensions,
} from "react-native";
import { Svg, Path, G } from "react-native-svg";

interface Point {
  x: number;
  y: number;
  timestamp: number;
}

interface Draw {
  points: Point[];
  color: string;
}

interface State {
  currentPoints: Point[];
  currentDraws: Draw[];
  color: string;
  handMoveEnabled: boolean;
  prevPoint: Point;
  prevTwoPoints: Point[];
  translate: { x: number; y: number };
  scale: number;
}

const SCREEN_WIDTH = Dimensions.get("window").width;
const SCREEN_HEIGHT = Dimensions.get("window").height - 100;

export default function Canvas() {
  const canvasRef = useRef<Svg>(null);
  const pan = useRef({ x: 0, y: 0 }).current;

  const [state, setState] = useState<State>({
    currentPoints: [],
    currentDraws: [],
    color: "black",
    handMoveEnabled: false,
    prevTwoPoints: [],
    prevPoint: { x: 0, y: 0, timestamp: 0 },
    translate: { x: 0, y: 0 },
    scale: 1,
  });

  const visibleWidth = SCREEN_WIDTH;
  const visibleHeight = SCREEN_HEIGHT;
  const minX = state.translate.x;
  const minY = -state.translate.y;

  const viewBox = `${minX} ${minY} ${visibleWidth} ${visibleHeight}`;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (event) => {
        if (event.nativeEvent.touches.length > 1) {
          return;
        }

        const [locationX, locationY, timestamp] = [
          event.nativeEvent.locationX,
          event.nativeEvent.locationY,
          event.nativeEvent.timestamp,
        ];

        // reset previous point
        setState((prev) => ({
          ...prev,
          prevPoint: { x: locationX, y: locationY, timestamp },
          prevTwoPoints: [],
        }));
      },
      onPanResponderMove: (event, gesture) => {
        const [locationX, locationY, timestamp] = [
          event.nativeEvent.locationX,
          event.nativeEvent.locationY,
          event.nativeEvent.timestamp,
        ];

        const multipleTouches = event.nativeEvent.changedTouches.length > 2;
        const twoTouches = event.nativeEvent.changedTouches.length === 2;

        const twoTouchesLocations = twoTouches
          ? {
              x1: event.nativeEvent.changedTouches[0].locationX,
              y1: event.nativeEvent.changedTouches[0].locationY,
              x2: event.nativeEvent.changedTouches[1].locationX,
              y2: event.nativeEvent.changedTouches[1].locationY,
            }
          : null;

        // update state
        setState((prev) => {
          if (twoTouches && twoTouchesLocations) {
            const { x1, y1, x2, y2 } = twoTouchesLocations;

            // calculate pinch distance using prevTwoPoints
            const distance = Math.sqrt(
              Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2)
            );

            if (prev.prevTwoPoints.length < 2) {
              return {
                ...prev,
                prevTwoPoints: [
                  { x: x1, y: y1, timestamp },
                  { x: x2, y: y2, timestamp },
                ],
              };
            }

            const prevDistance = Math.sqrt(
              Math.pow(prev.prevTwoPoints[1].x - prev.prevTwoPoints[0].x, 2) +
                Math.pow(prev.prevTwoPoints[1].y - prev.prevTwoPoints[0].y, 2)
            );

            let scale = prev.scale * (distance / prevDistance);
            scale = scale < 0.1 ? 0.1 : scale;

            return {
              ...prev,
              prevTwoPoints: [
                { x: x1, y: y1, timestamp },
                { x: x2, y: y2, timestamp },
              ],
              scale,
              currentPoints: [],
            };
          }

          if (prev.handMoveEnabled || multipleTouches) {
            // calculate delta
            const deltaX = locationX - prev.prevPoint.x;
            const deltaY = locationY - prev.prevPoint.y;

            const [up, down, right, left] = [
              deltaY < 0,
              deltaY > 0,
              deltaX > 0,
              deltaX < 0,
            ];

            return {
              ...prev,
              prevPoint: { x: locationX, y: locationY, timestamp },
              prevTwoPoints: [],
              translate: {
                ...prev.translate,
                x: right || left ? prev.translate.x - deltaX : prev.translate.x,
                y: up || down ? prev.translate.y + deltaY : prev.translate.y,
              },
              currentPoints: [],
            };
          }

          // consider translate for locations
          const [x, y] = [
            (locationX + prev.translate.x) / prev.scale,
            (locationY - prev.translate.y) / prev.scale,
          ];

          return {
            ...prev,
            currentPoints: [...prev.currentPoints, { x, y, timestamp }],
            prevPoint: { x, y, timestamp },
          };
        });
      },
      onPanResponderRelease: (event) => {
        if (event.nativeEvent.touches.length > 1) {
          return;
        }

        // update state
        setState((prev) => ({
          ...prev,
          currentDraws: [
            ...prev.currentDraws,
            {
              points: prev.currentPoints,
              color: prev.color,
            },
          ],
          prevPoint: { x: 0, y: 0, timestamp: 0 },
          currentPoints: [],
          prevTwoPoints: [],
        }));
      },
    })
  ).current;

  const _onLayoutContainer = (e: LayoutChangeEvent) => {
    // this.state.pen.setOffset(e.nativeEvent.layout);
  };

  function pointsToSvg(points: { x: number; y: number }[] = []) {
    if (points.length > 0) {
      var path = `M ${points[0].x},${points[0].y}`;
      points.forEach((point) => {
        path = path + ` L ${point.x},${point.y}`;
      });
      return path;
    } else {
      return "";
    }
  }

  return (
    <View style={{ flex: 1, flexDirection: "column" }}>
      <View
        style={{
          gap: 10,
          flexDirection: "row",
          justifyContent: "center",
        }}
      >
        <TouchableOpacity
          style={{
            marginTop: 50,
            width: 50,
            height: 50,
            justifyContent: "center",
            alignItems: "center",
          }}
          onPress={() => {
            setState((prev) => ({
              ...prev,
              currentDraws: [],
              translate: { x: 0, y: 0 },
            }));
          }}
        >
          <Feather name="trash" size={24} color="black" />
        </TouchableOpacity>
        <TouchableOpacity
          style={{
            marginTop: 50,
            width: 50,
            height: 50,
            justifyContent: "center",
            alignItems: "center",
          }}
          onPress={() => {
            // undo, pop last draw
            setState((prev) => {
              prev.currentDraws.pop();
              return {
                ...prev,
                currentDraws: prev.currentDraws,
              };
            });
          }}
        >
          <Feather name="rotate-ccw" size={24} color="black" />
        </TouchableOpacity>
        <TouchableOpacity
          style={{
            marginTop: 50,
            width: 50,
            height: 50,
            justifyContent: "center",
            alignItems: "center",
          }}
          onPress={() => {
            setState((prev) => ({
              ...prev,
              color: "black",
            }));
          }}
        >
          <View
            style={{
              width: 25,
              height: 25,
              backgroundColor: "black",
              borderRadius: 50,
              opacity: state.color === "black" ? 1 : 0.3,
            }}
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={{
            marginTop: 50,
            width: 50,
            height: 50,
            justifyContent: "center",
            alignItems: "center",
          }}
          onPress={() => {
            setState((prev) => ({
              ...prev,
              color: "red",
            }));
          }}
        >
          <View
            style={{
              width: 25,
              height: 25,
              backgroundColor: "red",
              opacity: state.color === "red" ? 1 : 0.3,
              borderRadius: 50,
            }}
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={{
            marginTop: 50,
            width: 50,
            height: 50,
            justifyContent: "center",
            alignItems: "center",
          }}
          onPress={() => {
            setState((prev) => ({
              ...prev,
              scale: prev.scale + 1,
            }));
          }}
        >
          <Feather name="zoom-in" size={24} color="black" />
        </TouchableOpacity>
        <TouchableOpacity
          style={{
            marginTop: 50,
            width: 50,
            height: 50,
            justifyContent: "center",
            alignItems: "center",
          }}
          onPress={() => {
            setState((prev) => ({
              ...prev,
              scale: prev.scale - 0.1 < 0.1 ? 0.1 : prev.scale - 0.1,
            }));
          }}
        >
          <Feather name="zoom-out" size={24} color="black" />
        </TouchableOpacity>

        <TouchableOpacity
          style={{
            marginTop: 50,
            width: 50,
            height: 50,
            backgroundColor: state.handMoveEnabled
              ? "lightgray"
              : "transparent",
            justifyContent: "center",
            alignItems: "center",
            borderRadius: 50,
          }}
          onPress={() => {
            setState((prev) => ({
              ...prev,
              handMoveEnabled: !prev.handMoveEnabled,
            }));
          }}
        >
          <Feather name="move" size={24} color="black" />
        </TouchableOpacity>
        <TouchableOpacity
          style={{
            marginTop: 50,
            width: 50,
            height: 50,
            justifyContent: "center",
            alignItems: "center",
          }}
          onPress={() => {
            setState((prev) => ({
              ...prev,
              translate: { x: 0, y: 0 },
              scale: 1,
            }));
          }}
        >
          <Feather name="maximize" size={24} color="black" />
        </TouchableOpacity>
      </View>

      <View style={{ overflow: "hidden", flex: 1 }}>
        <Text
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            zIndex: 100,
          }}
        >
          {viewBox} scale: {state.scale}
        </Text>
        <Animated.View
          onLayout={_onLayoutContainer}
          style={[
            styles.container,
            {
              transform: [
                // { scale },
                // { translateX: translate.x },
                // { translateY: translate.y },
              ],
            },
          ]}
        >
          <Svg
            ref={canvasRef}
            style={styles.svg}
            fill="#ccc"
            scale={state.scale}
            viewBox={viewBox}
          >
            <G>
              {state.currentDraws.map((draw, index) => (
                <Path
                  key={index}
                  d={pointsToSvg(draw.points)}
                  stroke={draw.color}
                  strokeWidth={2 / state.scale}
                  fill="none"
                  scale={state.scale}
                />
              ))}
              <Path
                d={pointsToSvg(state.currentPoints)}
                stroke={state.color}
                strokeWidth={2 / state.scale}
                scale={state.scale}
                fill="none"
              />
            </G>
          </Svg>
          <View {...panResponder.panHandlers} style={styles.touchArea} />
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "lightgray",
  },
  svg: {
    position: "absolute",
    backgroundColor: "transparent",
  },
  touchArea: {
    ...StyleSheet.absoluteFillObject,
  },
  canvas: {
    flex: 1,
  },
});
