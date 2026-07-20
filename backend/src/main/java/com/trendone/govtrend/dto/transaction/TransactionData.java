package com.trendone.govtrend.dto.transaction;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonProperty;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class TransactionData {

    private int version;

    @JsonProperty("file_name")
    private String fileName;

    private List<TransactionChange> items;
}
