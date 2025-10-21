# 🌐 Decentralized P2P Service Feedback Platform

Welcome to a revolutionary Web3 solution for peer-to-peer service feedback! This project addresses the real-world problem of opaque and centralized funding allocation in service-based ecosystems, such as freelance marketplaces, community projects, or NGO initiatives. By leveraging blockchain transparency, users can provide verifiable feedback on P2P services, which directly influences how funds from a shared pool are allocated to service providers. This ensures merit-based funding, reduces bias, and empowers communities to reward high-quality services. Built on the Stacks blockchain using Clarity smart contracts for security and predictability.

## ✨ Features

🔍 Submit anonymous or verified feedback on P2P services  
📊 Aggregate feedback scores to compute provider reputations  
💰 Deposit funds into a communal pool for allocation  
⚖️ Automated funding distribution based on feedback-driven algorithms  
🗳️ Governance mechanisms for community parameter adjustments  
🔒 Immutable records of all feedback and transactions  
🚫 Dispute resolution for contested feedback  
📈 Staking rewards for active participants  

## 🛠 How It Works

**For Service Providers**  
- Register your service and profile via the ServiceRegistry contract.  
- Deliver P2P services off-chain (e.g., consulting, tutoring, or community work).  
- Receive feedback from users, which updates your reputation score in the ReputationAggregator.  
- Earn allocations from the funding pool based on your score—higher feedback means more funds!  

**For Users (Feedback Givers)**  
- Interact with a service and submit feedback (ratings + comments) using the FeedbackSubmission contract.  
- Optionally stake tokens to weight your feedback higher via the StakingMechanism.  
- View transparent allocations and participate in governance votes.  

**For Funders/Donors**  
- Deposit tokens or STX into the FundingPool contract.  
- Funds are locked until allocation periods (e.g., monthly), then distributed via the AllocationDistributor based on aggregated feedback.  

**Overall Flow**  
1. Providers register services.  
2. Users engage and submit feedback.  
3. Feedback is aggregated into scores.  
4. At set intervals, the system calculates and distributes funds proportionally to scores.  
5. Disputes can be raised and resolved through community voting.  

This setup solves issues like unfair funding in centralized platforms by making everything on-chain, auditable, and community-driven.

## 📜 Smart Contracts Overview

The project is modularized into 8 Clarity smart contracts for scalability and maintainability. Each handles a specific aspect to ensure separation of concerns.

1. **UserRegistry.clar**  
   - Handles user registration and profile management.  
   - Functions: `register-user`, `update-profile`, `get-user-info`.  
   - Ensures only registered users can participate.  

2. **ServiceRegistry.clar**  
   - Allows providers to list and manage their P2P services.  
   - Functions: `register-service`, `update-service`, `get-service-details`.  
   - Stores service metadata like descriptions and categories.  

3. **FeedbackSubmission.clar**  
   - Enables users to submit feedback on services (ratings 1-5, optional comments).  
   - Functions: `submit-feedback`, `get-feedback-by-service`.  
   - Prevents spam with rate limiting and optional staking requirements.  

4. **ReputationAggregator.clar**  
   - Aggregates feedback into reputation scores (e.g., weighted averages).  
   - Functions: `calculate-score`, `get-reputation`.  
   - Uses time-decay for recent feedback to matter more.  

5. **FundingPool.clar**  
   - Manages deposits and locks funds for allocation.  
   - Functions: `deposit-funds`, `get-pool-balance`, `withdraw-emergency` (admin only).  
   - Supports multiple token types via Clarity's fungible token traits.  

6. **AllocationCalculator.clar**  
   - Computes funding shares based on reputation scores.  
   - Functions: `compute-allocations`, `get-share`.  
   - Algorithm: Proportional distribution (e.g., score / total_scores * pool_balance).  

7. **AllocationDistributor.clar**  
   - Executes fund distributions at epochs (e.g., block-height triggered).  
   - Functions: `distribute-funds`, `claim-allocation`.  
   - Transfers funds to providers' wallets atomically.  

8. **GovernanceAndDisputes.clar**  
   - Handles community governance (e.g., parameter votes) and dispute resolution.  
   - Functions: `propose-change`, `vote-on-proposal`, `raise-dispute`, `resolve-dispute`.  
   - Uses token staking for voting power to prevent sybil attacks.  

## 🚀 Getting Started

To deploy:  
- Install the Clarinet SDK for Clarity development.  
- Deploy contracts in order (UserRegistry first, then dependencies).  
- Interact via Stacks wallets or custom frontends.  

This project promotes fair, decentralized funding—perfect for DAOs, freelance networks, or community grants!