import { addSignal } from '../../domain';
import { SignalLog } from '../../types/NewSignalScheme/NewSignalScheme';

export function handleSignal( event: SignalLog): void {
    let signalId = event.params._sender.toHex();
    let proposalId = event.params._descriptionHash;
    addSignal(signalId, proposalId);
}
