import { SignalLog } from '../../types/NewSignalScheme/NewSignalScheme'; 
import * as domain from '../../domain';

export function handleSignal( event: SignalLog): void {
    let signalId = event.params._sender.toHex();
    let proposalId = event.params._descriptionHash;
    domain.addSignal(signalId, proposalId);
}
