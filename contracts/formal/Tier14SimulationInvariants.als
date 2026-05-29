module Tier14SimulationInvariants

sig SimulationRun {
  agentCount: one Int,
  invariantSamplingRate: one Int
}

pred ValidScale[r: SimulationRun] {
  r.agentCount = 10 or r.agentCount = 100 or r.agentCount = 1000 or
  r.agentCount = 10000 or r.agentCount = 100000 or r.agentCount = 1000000
}

assert Tier14SimulationScaleBounded {
  all r: SimulationRun | ValidScale[r]
}
