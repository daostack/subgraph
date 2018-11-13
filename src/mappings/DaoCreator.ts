import 'allocator/arena'
export { allocate_memory }

import { NewOrg } from '../types/DaoCreator/DaoCreator'
import { createDao } from '../utils'

export function handleNewOrg(event: NewOrg): void {
    createDao(event.params._avatar);
}
