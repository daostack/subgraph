import { crypto } from '@graphprotocol/graph-ts';
import { ContinuousLocking4Reputation } from '../../types/ContinuousLocking4Reputation/ContinuousLocking4Reputation';
import { NewCL4R } from '../../types/ContinuousLocking4ReputationFactory/ContinuousLocking4ReputationFactory';
import {
  ContractInfo, ControllerScheme,
} from '../../types/schema';
import { concat, createTemplate, fetchTemplateName, setContractInfo } from '../../utils';

export function handleNewCL4R(event: NewCL4R): void {
  let continuousLocking4ReputationAddress = event.params.continuousLocking4Reputation;

  let continuousLocking4Reputation = ContinuousLocking4Reputation.bind(continuousLocking4ReputationAddress);
  let avatar = continuousLocking4Reputation.avatar();
  let schemeId = crypto.keccak256(concat(avatar, continuousLocking4ReputationAddress)).toHex();

  // If the scheme already exists, early out
  if (ControllerScheme.load(schemeId) != null) {
    return;
  }

  let continuousLocking4ReputationFactoryInfo = ContractInfo.load(event.address.toHex());

  let continuousLocking4ReputationTemplate = fetchTemplateName(
    'ContinuousLocking4Reputation',
    continuousLocking4ReputationFactoryInfo.version,
  );

  if (continuousLocking4ReputationTemplate == null) {
    // We're missing a template version in the subgraph
    return;
  }

  setContractInfo(
    continuousLocking4ReputationAddress.toHex(),
    'ContinuousLocking4Reputation',
    'ContinuousLocking4Reputation',
    continuousLocking4ReputationFactoryInfo.version,
  );

  // Tell the subgraph to start indexing events from the ContinuousLocking4Reputation
  createTemplate(continuousLocking4ReputationTemplate, continuousLocking4ReputationAddress);
}
