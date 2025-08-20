# Expense Submission System (Full Stack)

## Meta Information

- **Task ID**: `TASK-004`
- **Title**: Complete expense submission and automatic policy application
- **Status**: `Not Started`
- **Priority**: `P0`
- **Created**: 2025-08-20
- **Updated**: 2025-08-20
- **Estimated Effort**: 3 days
- **Actual Effort**: TBD

## Related Documents

- **PRD**: docs/product/prd-main.md (FR6: Expense Submission)
- **Dependencies**: TASK-001 (User/Organization Management), TASK-002 (Expense Categories), TASK-003 (Policy Management)

## Description

Implement complete expense submission system including database schema, tRPC API endpoints, UI components, and tests. This enables users to submit expenses with automatic policy rule application, including auto-rejection for over-limit expenses and routing to auto-approval or manual review.

## Acceptance Criteria

- [ ] Database schema for expenses with status tracking
- [ ] Users can submit expenses with date, amount, category, and description
- [ ] System automatically applies policy rules on submission
- [ ] Auto-rejection for expenses over policy limits
- [ ] Expenses under limit route to auto-approval or manual review per policy
- [ ] Expense status tracking (submitted → approved/rejected)
- [ ] Expense submission UI with proper validation
- [ ] Real-time policy feedback during expense creation
- [ ] Complete test coverage

## TODOs

### Database Schema
- [ ] Add Expense model to Prisma schema
- [ ] Add expense status enum (submitted, approved, rejected, auto_approved)
- [ ] Add relationships to user, organization, and category
- [ ] Create and run database migrations
- [ ] Add proper indexes for performance

### tRPC API
- [ ] Create expense submission API endpoint
- [ ] Integrate with policy resolution engine
- [ ] Implement automatic policy rule application
- [ ] Add expense listing and filtering endpoints
- [ ] Test API endpoints with policy scenarios

### UI Components
- [ ] Build expense submission form UI
- [ ] Add real-time policy validation feedback
- [ ] Create expense listing and filtering
- [ ] Implement expense status display
- [ ] Add proper loading and error states
- [ ] Create expense details view

### Testing
- [ ] Unit tests for expense business logic
- [ ] Integration tests for policy application
- [ ] Test auto-approval and manual review routing
- [ ] Component tests for UI elements
- [ ] Test expense status tracking

## Progress Updates

### 2025-08-20 - Task Restructured
**Status**: Not Started
**Progress**: Restructured as full-stack feature delivery
**Blockers**: Depends on policy management system
**Next Steps**: Wait for TASK-003 completion

## Completion Checklist

- [ ] All acceptance criteria met
- [ ] Code follows project standards
- [ ] Tests written and passing
- [ ] Documentation updated (if needed)
- [ ] Code review completed
- [ ] Feature is fully functional end-to-end

## Notes

This task delivers a complete working feature that provides immediate value:
- Core expense submission workflow
- Automatic policy enforcement
- Real-time user feedback
- Foundation for approval workflows

---

**Template Version**: 1.0
**Last Updated**: 2025-08-20
