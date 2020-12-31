import { crypto } from '@graphprotocol/graph-ts';
import { NewCompetition } from '../../types/CompetitionFactory/CompetitionFactory';
import { ContributionRewardExt } from '../../types/ContributionRewardExt/ContributionRewardExt';
import {
  ContractInfo, ControllerScheme,
} from '../../types/schema';
import { concat, createTemplate, fetchTemplateName, setContractInfo } from '../../utils';

export function handleNewCompetition(event: NewCompetition): void {
  let competitionAddress = event.params.competition;
  let contributionRewardExtAddress = event.params.contributionRewardExt;

  let contributionRewardExt = ContributionRewardExt.bind(contributionRewardExtAddress);
  let avatar = contributionRewardExt.avatar();
  let schemeId = crypto.keccak256(concat(avatar, contributionRewardExtAddress)).toHex();

  // If the scheme already exists, early out
  if (ControllerScheme.load(schemeId) != null) {
    return;
  }

  let competitionFactoryInfo = ContractInfo.load(event.address.toHex());

  let competitionTemplate = fetchTemplateName(
    'Competition',
    competitionFactoryInfo.version,
  );

  let contributionRewardExtTemplate = fetchTemplateName(
    'ContributionRewardExt',
    competitionFactoryInfo.version,
  );

  if (competitionTemplate == null || contributionRewardExtTemplate == null) {
    // We're missing a template version in the subgraph
    return;
  }

  setContractInfo(
    competitionAddress.toHex(),
    'Competition',
    'Competition',
    competitionFactoryInfo.version,
  );

  setContractInfo(
    contributionRewardExtAddress.toHex(),
    'ContributionRewardExt',
    'ContributionRewardExt',
    competitionFactoryInfo.version,
  );

  // Tell the subgraph to start indexing events from the GenericSchemeMultiCall
  createTemplate(competitionTemplate, competitionAddress);
  createTemplate(contributionRewardExtTemplate, contributionRewardExtAddress);
}
