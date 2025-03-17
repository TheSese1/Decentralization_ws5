import bodyParser from "body-parser";
import express from "express";
import { BASE_NODE_PORT } from "../config";
import { Value } from "../types";

type NodeState = {
  killed: boolean; // this is used to know if the node was stopped by the /stop route. It's important for the unit tests but not very relevant for the Ben-Or implementation
  x: 0 | 1 | "?" | null; // the current consensus value
  decided: boolean | null; // used to know if the node reached finality
  k: number | null; // current step of the node
};

export async function node(
  nodeId: number, // the ID of the node
  N: number, // total number of nodes in the network
  F: number, // number of faulty nodes in the network
  initialValue: Value, // initial value of the node
  isFaulty: boolean, // true if the node is faulty, false otherwise
  nodesAreReady: () => boolean, // used to know if all nodes are ready to receive requests
  setNodeIsReady: (index: number) => void // this should be called when the node is started and ready to receive requests
) {
  const node = express();
  node.use(express.json());
  node.use(bodyParser.json());

  // Internal state for NodeState
  let nodeState: NodeState = {
    killed: false, // assume the node is running by default
    x: initialValue as 0 | 1 | "?" | null, // initial value
    decided: null, // no finality reached at the beginning
    k: null, // no steps taken yet
  };

  // this route allows retrieving the current status of the node
  node.get("/status", (req: any, res: any) => {
    if (isFaulty) {
      return res.status(500).json({ message: "faulty" });
    } else {
      return res.status(200).json({ message: "live" })
    }
  });

  // TODO implement this
  node.post("/message", (req: any, res: any) => {
    const message = req.body;

    if (message.x !== undefined) {
      nodeState.x = message.x;
    }
    if (message.k !== undefined) {
      nodeState.k = message.k; // Update the node's current step if it's included in the message
    }
    if (message.decided !== undefined) {
      nodeState.decided = message.decided; // Update the finality decision
    }

    // Response to the sender
    res.status(200).json({
      message: `Node ${nodeId} processed the message.`,
      currentState: nodeState,
    });

  });
  // Function to start the consensus process
  const startConsensus = () => {
    // Initialize the consensus process when the /start route is called
    if (nodeState.k === null) {
      nodeState.k = 0; // Start from step 0 of the consensus
      nodeState.decided = false; // Not decided yet
      nodeState.x = initialValue as 0 | 1 | "?" | null; // Set initial value for x

      console.log(`Node ${nodeId} started consensus at step ${nodeState.k}`);
    }
  };

  // TODO implement this
  node.get("/start", async (req:any, res:any) => {
    startConsensus(); // Call the startConsensus function when the /start route is triggered
    res.status(200).json({
      message: `Node ${nodeId} started consensus at step ${nodeState.k}`,
      currentState: nodeState,
    });
  });

  // TODO implement this
  // this route is used to stop the consensus algorithm
  node.get("/stop", async (req, res) => {
    nodeState.killed = true; // Set the node's killed state to true
    console.log(`Node ${nodeId} has been stopped and is no longer active.`);
    res.status(200).json({ message: `Node ${nodeId} stopped the consensus and is now inactive.` });
  });

  // get the current state of a node
  node.get("/getState", (req: any, res: any) => {
    return res.status(200).json(nodeState)
  });

  // start the server
  const server = node.listen(BASE_NODE_PORT + nodeId, async () => {
    console.log(
      `Node ${nodeId} is listening on port ${BASE_NODE_PORT + nodeId}`
    );

    // the node is ready
    setNodeIsReady(nodeId);
  });

  return server;
}
