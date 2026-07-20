package com.trendone.govtrend.dto.governor;

import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class GovernorListResponse {

    private List<GovernorListItem> gvrnrList;
}
