import { crypto } from '@graphprotocol/graph-ts';
import { GenericSchemeMultiCall } from '../../types/GenericSchemeMultiCall/GenericSchemeMultiCall';
import { NewGenericSchemeMultiCall } from '../../types/GenericSchemeMultiCallFactory/GenericSchemeMultiCallFactory';
import {
  ContractInfo, ControllerScheme,
} from '../../types/schema';
import { concat, createTemplate, fetchTemplateName, setContractInfo } from '../../utils';

export function handleNewGenericSchemeMultiCall(event: NewGenericSchemeMultiCall): void {
  let genericSchemeMultiCallAddress = event.params.genericSchemeMultiCall;

  let genericSchemeMultiCall = GenericSchemeMultiCall.bind(genericSchemeMultiCallAddress);
  let avatar = genericSchemeMultiCall.avatar();
  let schemeId = crypto.keccak256(concat(avatar, genericSchemeMultiCallAddress)).toHex();

  // If the scheme already exists, early out
  if (ControllerScheme.load(schemeId) != null) {
    return;
  }

  let genericSchemeMultiCallFactoryInfo = ContractInfo.load(event.address.toHex());

  let genericSchemeMultiCallTemplate = fetchTemplateName(
    'GenericSchemeMultiCall',
    genericSchemeMultiCallFactoryInfo.version,
  );

  if (genericSchemeMultiCallTemplate == null) {
    // We're missing a template version in the subgraph
    return;
  }

  setContractInfo(
    genericSchemeMultiCallAddress.toHex(),
    'GenericSchemeMultiCall',
    'GenericSchemeMultiCall',
    genericSchemeMultiCallFactoryInfo.version,
  );

  // Tell the subgraph to start indexing events from the GenericSchemeMultiCall
  createTemplate(genericSchemeMultiCallTemplate, genericSchemeMultiCallAddress);
}
