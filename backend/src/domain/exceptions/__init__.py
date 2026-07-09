from typing import List
"""Domain exceptions - business rule violations."""


class DomainError(Exception):
    """Base domain error."""
    pass


class EntityNotFoundError(DomainError):
    def __init__(self, entity: str, identifier: str):
        super().__init__(f"{entity} with id '{identifier}' not found.")
        self.entity = entity
        self.identifier = identifier


class BudgetExceededError(DomainError):
    def __init__(self, budget_item_code: str, current: str, limit: str):
        super().__init__(
            f"Budget exceeded for {budget_item_code}: "
            f"current {current}, limit {limit}"
        )


class InvalidStateTransitionError(DomainError):
    def __init__(self, entity: str, current_state: str, target_state: str):
        super().__init__(
            f"Cannot transition {entity} from '{current_state}' to '{target_state}'."
        )


class ValidationError(DomainError):
    def __init__(self, errors: List[str]):
        super().__init__("; ".join(errors))
        self.errors = errors
