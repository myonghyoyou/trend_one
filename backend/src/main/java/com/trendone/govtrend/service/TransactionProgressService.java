package com.trendone.govtrend.service;

import com.trendone.govtrend.dao.TransactionProgressDao;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class TransactionProgressService {

    private final TransactionProgressDao transactionProgressDao;

    public TransactionProgressService(TransactionProgressDao transactionProgressDao) {
        this.transactionProgressDao = transactionProgressDao;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void initialize(String transactionId, String message) {
        update(transactionId, 0, message);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void update(String transactionId, int progressPercent, String message) {
        int normalizedPercent = Math.max(0, Math.min(100, progressPercent));
        transactionProgressDao.upsertProgress(transactionId, normalizedPercent, message);
    }
}
