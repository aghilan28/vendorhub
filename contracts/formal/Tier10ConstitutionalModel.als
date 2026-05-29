module Tier10ConstitutionalModel

sig Constitution {}
sig Amendment {
  target: one Constitution,
  proofPassed: one Bool,
  smtPassed: one Bool,
  simulationPassed: one Bool,
  rollbackAvailable: one Bool,
  active: one Bool
}

abstract sig Bool {}
one sig True, False extends Bool {}

pred Activatable[a: Amendment] {
  a.proofPassed = True
  a.smtPassed = True
  a.simulationPassed = True
  a.rollbackAvailable = True
}

assert NoActivationWithoutVerification {
  all a: Amendment | a.active = True implies Activatable[a]
}

check NoActivationWithoutVerification for 8
